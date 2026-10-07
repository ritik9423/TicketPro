package com.ticketpro.api.service.outpost;

import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.outpost.OutpostCheckTokenResponse;
import com.ticketpro.api.dto.outpost.OutpostTokenResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Collections;

/**
 * Low-level HTTP client for CI/CS Outpost OAuth 2.0 endpoints.
 * Handles timeouts, network retries, and error isolation without exposing secrets.
 */
@Component
@Slf4j
public class OutpostClient {

    private final OutpostProperties outpostProperties;
    private final RestTemplate restTemplate;

    public OutpostClient(OutpostProperties outpostProperties, RestTemplateBuilder builder) {
        this.outpostProperties = outpostProperties;
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofMillis(outpostProperties.getConnectTimeoutMs()))
                .setReadTimeout(Duration.ofMillis(outpostProperties.getReadTimeoutMs()))
                .build();
    }

    /**
     * Obtains an OAuth 2.0 access token from Outpost using default grant credentials.
     *
     * @param clientId Outpost Client ID (CI)
     * @param clientSecret Outpost Client Secret (CS)
     * @return OutpostTokenResponse containing access_token, expires_in, etc.
     */
    public OutpostTokenResponse fetchToken(String clientId, String clientSecret) {
        return fetchToken(
                clientId,
                clientSecret,
                outpostProperties.getGrantType(),
                outpostProperties.getUsername(),
                outpostProperties.getPassword(),
                outpostProperties.getScope()
        );
    }

    /**
     * Obtains an OAuth 2.0 access token from Outpost with explicit parameters.
     * Supports client_credentials and password grant types.
     */
    public OutpostTokenResponse fetchToken(String clientId, String clientSecret, String grantType,
                                          String username, String password, String scope) {
        String tokenUrl = outpostProperties.getTokenUrl();
        String effectiveGrant = (grantType != null && !grantType.isBlank()) ? grantType : outpostProperties.getGrantType();
        log.info("Requesting access token from Outpost token endpoint: {} (grant_type={})", tokenUrl, effectiveGrant);

        // Construct query parameters matching Mappls Outpost OAuth curl
        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromHttpUrl(tokenUrl)
                .queryParam("grant_type", effectiveGrant);

        if ("password".equalsIgnoreCase(effectiveGrant)) {
            uriBuilder.queryParam("username", username != null ? username : "");
            uriBuilder.queryParam("password", password != null ? password : "");
        } else {
            if (username != null && !username.isBlank()) uriBuilder.queryParam("username", username);
            if (password != null && !password.isBlank()) uriBuilder.queryParam("password", password);
        }

        if (clientId != null && !clientId.isBlank()) {
            uriBuilder.queryParam("client_id", clientId);
        }
        if (clientSecret != null && !clientSecret.isBlank()) {
            uriBuilder.queryParam("client_secret", clientSecret);
        }
        if (scope != null && !scope.isBlank()) {
            uriBuilder.queryParam("scope", scope);
        }

        URI targetUri = uriBuilder.build().encode().toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        // Add Basic Auth header if CI & CS present
        if (clientId != null && clientSecret != null && !clientId.isBlank() && !clientSecret.isBlank()) {
            String credentials = clientId + ":" + clientSecret;
            String basic = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
            headers.set(HttpHeaders.AUTHORIZATION, "Basic " + basic);
        }

        // Form body for dual compatibility
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", effectiveGrant);
        if ("password".equalsIgnoreCase(effectiveGrant)) {
            form.add("username", username != null ? username : "");
            form.add("password", password != null ? password : "");
        } else {
            if (username != null && !username.isBlank()) form.add("username", username);
            if (password != null && !password.isBlank()) form.add("password", password);
        }
        if (clientId != null && !clientId.isBlank()) form.add("client_id", clientId);
        if (clientSecret != null && !clientSecret.isBlank()) form.add("client_secret", clientSecret);
        if (scope != null && !scope.isBlank()) form.add("scope", scope);

        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(form, headers);

        try {
            ResponseEntity<OutpostTokenResponse> response = restTemplate.postForEntity(
                    targetUri,
                    requestEntity,
                    OutpostTokenResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Successfully received token response from Outpost.");
                return response.getBody();
            } else {
                log.warn("Outpost returned non-success HTTP status: {}", response.getStatusCode());
                return OutpostTokenResponse.builder()
                        .error("OUTPOST_ERROR")
                        .errorDescription("Outpost returned HTTP status: " + response.getStatusCode())
                        .build();
            }
        } catch (HttpStatusCodeException e) {
            log.error("Outpost token request failed [HTTP {}]: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return OutpostTokenResponse.builder()
                    .error("HTTP_" + e.getStatusCode().value())
                    .errorDescription("Outpost authentication failed: " + e.getResponseBodyAsString())
                    .build();
        } catch (ResourceAccessException e) {
            log.error("Outpost token service timeout or connection refused: {}", e.getMessage());
            return OutpostTokenResponse.builder()
                    .error("OUTPOST_UNAVAILABLE")
                    .errorDescription("Outpost authentication service is currently unreachable or timed out.")
                    .build();
        } catch (Exception e) {
            log.error("Unexpected error during Outpost token exchange: {}", e.getMessage());
            return OutpostTokenResponse.builder()
                    .error("INTERNAL_ERROR")
                    .errorDescription("Unexpected error while communicating with Outpost service: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Introspects / checks a token against Outpost check_token endpoint using default configured API key.
     *
     * @param token the Outpost access token to check
     * @return OutpostCheckTokenResponse
     */
    public OutpostCheckTokenResponse checkToken(String token) {
        return checkToken(token, outpostProperties.getCheckTokenApi());
    }

    /**
     * Introspects / checks a token against Outpost check_token endpoint.
     * Matches Mappls spec: Basic Auth header with CI/CS, and 'token' and 'api' in body.
     *
     * @param token the Outpost access token to check
     * @param api the Mappls API / AST key identifier
     * @return OutpostCheckTokenResponse
     */
    public OutpostCheckTokenResponse checkToken(String token, String api) {
        String checkTokenUrl = outpostProperties.getCheckTokenUrl();
        String effectiveApi = (api != null && !api.isBlank()) ? api : outpostProperties.getCheckTokenApi();
        log.debug("Checking token validity against Outpost check_token endpoint: {}", checkTokenUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        String clientId = outpostProperties.getClientId();
        String clientSecret = outpostProperties.getClientSecret();
        if (clientId != null && clientSecret != null && !clientId.isBlank() && !clientSecret.isBlank()) {
            String credentials = clientId + ":" + clientSecret;
            String basic = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
            headers.set(HttpHeaders.AUTHORIZATION, "Basic " + basic);
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("token", token);
        if (effectiveApi != null && !effectiveApi.isBlank()) {
            form.add("api", effectiveApi);
        }

        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(form, headers);

        try {
            ResponseEntity<OutpostCheckTokenResponse> response = restTemplate.postForEntity(
                    checkTokenUrl,
                    requestEntity,
                    OutpostCheckTokenResponse.class
            );
            return response.getBody();
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().is4xxClientError()) {
                log.debug("Outpost check_token: token is invalid or inactive [HTTP {}]: {}", e.getStatusCode(), e.getResponseBodyAsString());
            } else {
                log.warn("Outpost check_token server error [HTTP {}]: {}", e.getStatusCode(), e.getResponseBodyAsString());
            }
            return OutpostCheckTokenResponse.builder()
                    .active(false)
                    .error("HTTP_" + e.getStatusCode().value())
                    .errorDescription("Token check failed with status: " + e.getStatusCode())
                    .build();
        } catch (ResourceAccessException e) {
            log.error("Outpost check_token timeout/unreachable: {}", e.getMessage());
            return OutpostCheckTokenResponse.builder()
                    .active(false)
                    .error("OUTPOST_UNAVAILABLE")
                    .errorDescription("Outpost service is currently unreachable: " + e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("Error executing Outpost check_token: {}", e.getMessage());
            return OutpostCheckTokenResponse.builder()
                    .active(false)
                    .error("CHECK_TOKEN_ERROR")
                    .errorDescription(e.getMessage())
                    .build();
        }
    }
}
