package com.ticketpro.api.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.convert.converter.Converter;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Converts a validated Outpost OAuth2 JWT into a Spring Security Authentication token.
 *
 * Extracts and maps:
 * 1. "roles" claim (maps to ROLE_<name> for hasRole())
 * 2. "realm_access.roles" claim (Keycloak / standard OAuth2 format)
 * 3. "authorities" claim
 * 4. "scope" or "scp" claim (maps to SCOPE_<name>)
 *
 * If the JWT subject or email corresponds to a registered TicketPro user,
 * the principal is enriched with CustomUserDetails to support multi-tenant
 * company access and user-scoped authorization.
 */
@Component
@Slf4j
public class OutpostJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserDetailsService userDetailsService;

    public OutpostJwtAuthenticationConverter(UserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @Override
    public AbstractAuthenticationToken convert(@NonNull Jwt jwt) {
        Set<GrantedAuthority> authorities = new LinkedHashSet<>(extractAuthorities(jwt));

        String identity = extractIdentity(jwt);
        Object principal = identity;

        if (identity != null && !identity.isBlank()) {
            try {
                UserDetails userDetails = userDetailsService.loadUserByUsername(identity);
                if (userDetails instanceof CustomUserDetails customUserDetails) {
                    // Check if account or company is blocked/suspended
                    if (customUserDetails.isEnabled() && customUserDetails.isAccountNonLocked()) {
                        principal = customUserDetails;
                        authorities.addAll(customUserDetails.getAuthorities());
                        log.debug("Successfully enriched Outpost JWT principal with local user: {}", identity);
                    } else {
                        log.warn("Local user account {} is disabled or locked.", identity);
                    }
                }
            } catch (UsernameNotFoundException e) {
                log.debug("Outpost JWT identity {} is not a local database user. Authenticating as service principal.", identity);
            }
        }

        // If no authorities could be extracted, assign standard client authority
        if (authorities.isEmpty()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_CI_CS_CLIENT"));
        }

        return new OutpostJwtAuthenticationToken(jwt, principal, authorities);
    }

    /**
     * Extracts authorities from common OAuth 2.0 / Outpost JWT claims.
     */
    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        Set<GrantedAuthority> authorities = new LinkedHashSet<>();

        // 1. Check "roles" claim (List<String> or space-delimited String)
        Object rolesClaim = jwt.getClaims().get("roles");
        if (rolesClaim instanceof Collection<?> rolesList) {
            for (Object role : rolesList) {
                if (role != null) {
                    authorities.add(formatRoleAuthority(role.toString()));
                }
            }
        } else if (rolesClaim instanceof String rolesStr && !rolesStr.isBlank()) {
            for (String role : rolesStr.split("[,\\s]+")) {
                if (!role.isBlank()) {
                    authorities.add(formatRoleAuthority(role));
                }
            }
        }

        // 2. Check Keycloak / standard OAuth2 "realm_access.roles"
        Object realmAccess = jwt.getClaims().get("realm_access");
        if (realmAccess instanceof Map<?, ?> realmMap) {
            Object realmRoles = realmMap.get("roles");
            if (realmRoles instanceof Collection<?> rolesList) {
                for (Object role : rolesList) {
                    if (role != null) {
                        authorities.add(formatRoleAuthority(role.toString()));
                    }
                }
            }
        }

        // 3. Check "authorities" claim
        Object authoritiesClaim = jwt.getClaims().get("authorities");
        if (authoritiesClaim instanceof Collection<?> authList) {
            for (Object auth : authList) {
                if (auth != null) {
                    authorities.add(formatRoleAuthority(auth.toString()));
                }
            }
        }

        // 4. Check "scope" or "scp" claims (e.g. "read write" -> SCOPE_read, SCOPE_write)
        Object scopeClaim = jwt.getClaims().get("scope");
        if (scopeClaim == null) {
            scopeClaim = jwt.getClaims().get("scp");
        }
        if (scopeClaim instanceof String scopeStr && !scopeStr.isBlank()) {
            for (String scope : scopeStr.split("\\s+")) {
                if (!scope.isBlank()) {
                    authorities.add(new SimpleGrantedAuthority("SCOPE_" + scope));
                }
            }
        } else if (scopeClaim instanceof Collection<?> scopeList) {
            for (Object scope : scopeList) {
                if (scope != null) {
                    authorities.add(new SimpleGrantedAuthority("SCOPE_" + scope.toString()));
                }
            }
        }

        return authorities;
    }

    private GrantedAuthority formatRoleAuthority(String rawRole) {
        String trimmed = rawRole.trim();
        if (trimmed.startsWith("ROLE_") || trimmed.startsWith("SCOPE_")) {
            return new SimpleGrantedAuthority(trimmed);
        }
        return new SimpleGrantedAuthority("ROLE_" + trimmed.toUpperCase(Locale.ROOT));
    }

    /**
     * Resolves the user or service identity string from JWT claims.
     */
    private String extractIdentity(Jwt jwt) {
        // Priority order: email -> preferred_username -> user_name -> sub -> client_id
        String email = jwt.getClaimAsString("email");
        if (email != null && !email.isBlank()) {
            return email;
        }

        String preferredUsername = jwt.getClaimAsString("preferred_username");
        if (preferredUsername != null && !preferredUsername.isBlank()) {
            return preferredUsername;
        }

        String userName = jwt.getClaimAsString("user_name");
        if (userName != null && !userName.isBlank()) {
            return userName;
        }

        String sub = jwt.getSubject();
        if (sub != null && !sub.isBlank()) {
            return sub;
        }

        String clientId = jwt.getClaimAsString("client_id");
        if (clientId != null && !clientId.isBlank()) {
            return clientId;
        }

        return null;
    }
}
