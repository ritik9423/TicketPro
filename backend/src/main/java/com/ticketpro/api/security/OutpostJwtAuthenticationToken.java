package com.ticketpro.api.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;

/**
 * Authentication token for Outpost OAuth2 Resource Server.
 * Holds the validated Jwt, authorities mapped from Outpost claims,
 * and the principal (CustomUserDetails when mapped to a local user, or Jwt/String for machine clients).
 */
public class OutpostJwtAuthenticationToken extends AbstractAuthenticationToken {

    private final Jwt jwt;
    private final Object principal;

    public OutpostJwtAuthenticationToken(Jwt jwt, Object principal, Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.jwt = jwt;
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return this.jwt;
    }

    @Override
    public Object getPrincipal() {
        return this.principal;
    }

    public Jwt getJwt() {
        return this.jwt;
    }

    @Override
    public String getName() {
        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getUsername();
        }
        if (jwt.getSubject() != null && !jwt.getSubject().isBlank()) {
            return jwt.getSubject();
        }
        String clientId = jwt.getClaimAsString("client_id");
        if (clientId != null && !clientId.isBlank()) {
            return clientId;
        }
        return "outpost-principal";
    }
}
