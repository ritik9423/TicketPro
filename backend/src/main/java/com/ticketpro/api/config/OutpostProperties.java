package com.ticketpro.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for CI/CS Outpost OAuth 2.0 integration & Mappls Anchor API.
 * Loaded dynamically from application.properties / .env / environment variables.
 */
@Component
@ConfigurationProperties(prefix = "outpost")
@Getter
@Setter
public class OutpostProperties {

    /**
     * Outpost base URL, e.g. https://outpost.mappls.com
     */
    private String baseUrl = "https://outpost.mappls.com";

    /**
     * Outpost token generation URL, e.g. https://outpost.mappls.com/api/security/oauth/token
     */
    private String tokenUrl = "https://outpost.mappls.com/api/security/oauth/token";

    /**
     * Outpost token introspection / check_token URL, e.g. https://outpost.mappls.com/api/security/oauth/check_token
     */
    private String checkTokenUrl = "https://outpost.mappls.com/api/security/oauth/check_token";

    /**
     * Outpost Client ID (CI)
     */
    private String clientId = "";

    /**
     * Outpost Client Secret (CS)
     */
    private String clientSecret = "";

    /**
     * Outpost OAuth 2.0 Grant Type (default: client_credentials)
     */
    private String grantType = "client_credentials";

    /**
     * Outpost username (optional for password grant)
     */
    private String username = "";

    /**
     * Outpost password (optional for password grant)
     */
    private String password = "";

    /**
     * Outpost API identifier for check_token (loaded from .env / application.properties)
     */
    private String checkTokenApi = "";

    /**
     * Outpost OAuth 2.0 Scope(s)
     */
    private String scope = "";

    /**
     * Outpost OIDC / OAuth2 Issuer URI
     */
    private String issuerUri = "";

    /**
     * Outpost JWKS (JSON Web Key Set) URI
     */
    private String jwkSetUri = "";

    /**
     * Expected JWT Audience (aud claim)
     */
    private String audience = "";

    /**
     * In-memory cache TTL for validated Outpost tokens (in seconds)
     */
    private int tokenCacheTtlSeconds = 300;

    /**
     * Connection timeout in milliseconds for Outpost HTTP calls
     */
    private int connectTimeoutMs = 15000;

    /**
     * Read timeout in milliseconds for Outpost HTTP calls
     */
    private int readTimeoutMs = 15000;

    /**
     * Mappls Anchor base URL, e.g. https://anchor.mappls.com
     */
    private String anchorBaseUrl = "https://anchor.mappls.com";

    /**
     * Mappls Anchor user management endpoint, e.g. https://anchor.mappls.com/api/users/
     */
    private String anchorUsersUrl = "https://anchor.mappls.com/api/users/";

    /**
     * Whether to automatically synchronize newly created TicketPro users to Mappls Anchor
     */
    private boolean anchorSyncEnabled = false;

    /**
     * Returns true if Outpost CI and CS credentials are configured.
     */
    public boolean isConfigured() {
        return clientId != null && !clientId.trim().isEmpty() &&
               clientSecret != null && !clientSecret.trim().isEmpty();
    }

    public boolean hasJwkSetUri() {
        return jwkSetUri != null && !jwkSetUri.trim().isEmpty();
    }

    public boolean hasIssuerUri() {
        return issuerUri != null && !issuerUri.trim().isEmpty();
    }

    public boolean hasAudience() {
        return audience != null && !audience.trim().isEmpty();
    }
}
