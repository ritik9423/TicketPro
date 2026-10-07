package com.ticketpro.api.config;

import com.ticketpro.api.dto.outpost.OutpostCheckTokenResponse;
import com.ticketpro.api.security.OutpostJwtAuthenticationConverter;
import com.ticketpro.api.service.outpost.OutpostAuthService;
import com.ticketpro.api.service.outpost.OutpostClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Slf4j
public class SecurityConfig {

    private final OutpostProperties outpostProperties;
    private final OutpostJwtAuthenticationConverter outpostJwtAuthenticationConverter;

    @Value("${ticketpro.cors.allowed-origins:http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000}")
    private String allowedOrigins;

    public SecurityConfig(OutpostProperties outpostProperties,
                          OutpostJwtAuthenticationConverter outpostJwtAuthenticationConverter) {
        this.outpostProperties = outpostProperties;
        this.outpostJwtAuthenticationConverter = outpostJwtAuthenticationConverter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"UNAUTHORIZED\",\"message\":\"Authentication required. Please provide a valid Outpost Bearer token.\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"FORBIDDEN\",\"message\":\"Access denied. You do not have permission for this resource.\"}");
                })
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(outpostJwtAuthenticationConverter)
                )
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    String msg = authException.getMessage() != null ? authException.getMessage().replace("\"", "'") : "Invalid Outpost Bearer token";
                    response.getWriter().write("{\"error\":\"INVALID_TOKEN\",\"message\":\"" + msg + "\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // 1. Health & Status Checks (Strict: only health & info, NOT full /actuator/**)
                .requestMatchers("/actuator/health", "/actuator/info", "/health", "/api/health", "/api/public/**").permitAll()

                // 2. Developer Documentation (Swagger UI & OpenAPI v3 Specs)
                .requestMatchers(
                    "/v3/api-docs/**",
                    "/v3/api-docs.yaml",
                    "/swagger-ui/**",
                    "/swagger-ui.html"
                ).permitAll()

                // 3. Outpost Status (public health check only); all other Outpost/Anchor endpoints require SUPER_ADMIN
                .requestMatchers("/api/outpost/status").permitAll()
                .requestMatchers("/api/outpost/**", "/api/anchor/**").hasRole("SUPER_ADMIN")

                // 4. Super Admin Only: System impersonation
                .requestMatchers(HttpMethod.POST, "/api/auth/impersonate/**").hasRole("SUPER_ADMIN")

                // 5. Authentication & Onboarding (Login, Register, Password Reset, Active Companies for login selector, Onboarding Requests)
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/companies/register-request", "/api/companies/register").permitAll()

                // 6. Real-Time WebSockets: STOMP handshake & SockJS (HTTP handshake allowed; STOMP frames validated in ChannelInterceptor)
                .requestMatchers("/ws", "/ws/**").permitAll()

                // 7. External Webhooks: Only inbound email webhook with secret validation is public; /process requires auth
                .requestMatchers(HttpMethod.POST, "/api/inbound/email/webhook").permitAll()

                // 8. Public Customer Support Form: Dedicated rate-limited guest endpoint & Category read-only
                .requestMatchers(HttpMethod.POST, "/api/public/tickets").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories", "/api/categories/**").permitAll()

                // 9. CORS Preflight Requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // 10. EVERYTHING ELSE: Requires valid Outpost Access Token Authentication (includes /api/attachments/**, /api/feedback/**)
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder(OutpostClient outpostClient, OutpostAuthService outpostAuthService) {
        if (outpostProperties.hasJwkSetUri()) {
            log.info("Configuring Outpost JwtDecoder with JWKS endpoint: {}", outpostProperties.getJwkSetUri());
            NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(outpostProperties.getJwkSetUri()).build();
            configureJwtValidators(jwtDecoder);
            return jwtDecoder;
        } else if (outpostProperties.hasIssuerUri()) {
            log.info("Configuring Outpost JwtDecoder with Issuer URI: {}", outpostProperties.getIssuerUri());
            NimbusJwtDecoder jwtDecoder = JwtDecoders.fromIssuerLocation(outpostProperties.getIssuerUri());
            configureJwtValidators(jwtDecoder);
            return jwtDecoder;
        } else {
            log.info("Configuring Outpost Token Introspection Decoder backed by Mappls check_token API.");
            return token -> decodeWithOutpostCheckToken(token, outpostClient, outpostAuthService);
        }
    }

    private Jwt decodeWithOutpostCheckToken(String token, OutpostClient outpostClient, OutpostAuthService outpostAuthService) {
        if (token == null || token.isBlank()) {
            throw new BadJwtException("Token must not be null or empty");
        }

        OutpostCheckTokenResponse checkResponse = outpostAuthService.introspectToken(token);
        if (checkResponse == null || !checkResponse.isTokenActive()) {
            String errorMsg = (checkResponse != null && checkResponse.getErrorDescription() != null)
                    ? checkResponse.getErrorDescription()
                    : "Outpost token is inactive, expired, or invalid.";
            throw new BadJwtException(errorMsg);
        }

        Instant issuedAt = Instant.now();
        Instant expiresAt = (checkResponse.getExp() != null && checkResponse.getExp() > 0)
                ? Instant.ofEpochSecond(checkResponse.getExp())
                : issuedAt.plusSeconds(3600);

        String subject = checkResponse.getEmail() != null && !checkResponse.getEmail().isBlank()
                ? checkResponse.getEmail()
                : (checkResponse.getUserName() != null && !checkResponse.getUserName().isBlank()
                    ? checkResponse.getUserName()
                    : (checkResponse.getClientId() != null ? checkResponse.getClientId() : "outpost-principal"));

        Map<String, Object> headers = Collections.singletonMap("alg", "none");
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", subject);
        claims.put("email", subject);
        claims.put("roles", "USER");
        if (checkResponse.getClientId() != null) claims.put("client_id", checkResponse.getClientId());
        if (checkResponse.getUserName() != null) claims.put("user_name", checkResponse.getUserName());
        if (checkResponse.getUserId() != null) claims.put("user_id", checkResponse.getUserId());
        if (checkResponse.getApi() != null) claims.put("api", checkResponse.getApi());
        if (checkResponse.getScopes() != null && !checkResponse.getScopes().isEmpty()) {
            claims.put("scope", String.join(" ", checkResponse.getScopes()));
        }

        return new Jwt(token, issuedAt, expiresAt, headers, claims);
    }

    private void configureJwtValidators(NimbusJwtDecoder jwtDecoder) {
        List<OAuth2TokenValidator<Jwt>> validators = new ArrayList<>();

        // 1. Expiration & NotBefore Timestamp Validator
        validators.add(new JwtTimestampValidator());

        // 2. Issuer Validator (if configured)
        if (outpostProperties.hasIssuerUri()) {
            validators.add(new JwtIssuerValidator(outpostProperties.getIssuerUri()));
        }

        // 3. Audience Validator (if configured)
        if (outpostProperties.hasAudience()) {
            final String expectedAudience = outpostProperties.getAudience();
            validators.add(jwt -> {
                List<String> aud = jwt.getAudience();
                if (aud != null && aud.contains(expectedAudience)) {
                    return OAuth2TokenValidatorResult.success();
                }
                OAuth2Error error = new OAuth2Error(
                        OAuth2ErrorCodes.INVALID_TOKEN,
                        "Token audience " + aud + " does not match required audience: " + expectedAudience,
                        null
                );
                return OAuth2TokenValidatorResult.failure(error);
            });
        }

        jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(validators));
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        List<String> origins = new ArrayList<>();
        if (allowedOrigins != null && !allowedOrigins.trim().isEmpty()) {
            origins.addAll(Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList()));
        } else {
            origins.add("http://localhost:5173");
            origins.add("http://localhost:5174");
            origins.add("http://localhost:3000");
            origins.add("http://127.0.0.1:5173");
            origins.add("http://127.0.0.1:5174");
            origins.add("http://127.0.0.1:3000");
        }

        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
