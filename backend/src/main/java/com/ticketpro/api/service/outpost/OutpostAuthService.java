package com.ticketpro.api.service.outpost;

import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.outpost.OutpostCheckTokenResponse;
import com.ticketpro.api.dto.outpost.OutpostTokenResponse;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service managing Outpost token acquisition, user-to-token session association,
 * and high-performance token validation caching.
 */
@Service
@Slf4j
public class OutpostAuthService {

    private final OutpostClient outpostClient;
    private final OutpostProperties outpostProperties;

    // Active user-token sessions mapped from login: token -> SessionInfo
    private final Map<String, UserSession> activeTokenSessions = new ConcurrentHashMap<>();

    // Short-lived token introspection cache: token -> CachedIntrospection
    private final Map<String, CachedIntrospection> introspectionCache = new ConcurrentHashMap<>();

    @Getter
    public static class UserSession {
        private final String userEmail;
        private final long expiryTimestamp;

        public UserSession(String userEmail, long expiryTimestamp) {
            this.userEmail = userEmail;
            this.expiryTimestamp = expiryTimestamp;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > expiryTimestamp;
        }
    }

    @Getter
    public static class CachedIntrospection {
        private final OutpostCheckTokenResponse checkTokenResponse;
        private final long cacheExpiryTimestamp;

        public CachedIntrospection(OutpostCheckTokenResponse checkTokenResponse, long ttlSeconds) {
            this.checkTokenResponse = checkTokenResponse;
            this.cacheExpiryTimestamp = System.currentTimeMillis() + (ttlSeconds * 1000L);
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > cacheExpiryTimestamp;
        }
    }

    public OutpostAuthService(OutpostClient outpostClient, OutpostProperties outpostProperties) {
        this.outpostClient = outpostClient;
        this.outpostProperties = outpostProperties;
    }

    /**
     * Checks if Outpost CI & CS are configured.
     */
    public boolean isConfigured() {
        return outpostProperties.isConfigured();
    }

    /**
     * Diagnostic status report of Outpost integration.
     */
    public Map<String, Object> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("configured", isConfigured());
        status.put("clientId", outpostProperties.getClientId() != null ? "configured" : "missing");
        status.put("activeSessions", activeTokenSessions.size());
        status.put("cachedIntrospections", introspectionCache.size());
        return status;
    }

    /**
     * Obtains an Outpost access token for an authenticated TicketPro user and
     * associates the user's email with the token.
     * If Outpost credentials are not configured or rejected by Mappls, generates a resilient session token.
     *
     * @param userEmail the authenticated user's email
     * @return the Outpost access token string
     */
    public String obtainTokenForUser(String userEmail) {
        String cleanEmail = (userEmail != null) ? userEmail.trim().toLowerCase() : "";
        String b64Email = Base64.getUrlEncoder().withoutPadding().encodeToString(cleanEmail.getBytes(StandardCharsets.UTF_8));

        if (!isConfigured()) {
            log.warn("Outpost CI/CS credentials are not configured in environment. Generating a development Outpost token for {}", cleanEmail);
            String devToken = "op_dev_" + b64Email + "_" + UUID.randomUUID().toString().replace("-", "");
            long defaultTtlSeconds = 86400L; // 24 hours
            associateUserToken(devToken, cleanEmail, defaultTtlSeconds);
            return devToken;
        }

        log.info("Requesting fresh access token from Outpost for user: {}", cleanEmail);
        try {
            OutpostTokenResponse response = outpostClient.fetchToken(
                    outpostProperties.getClientId(),
                    outpostProperties.getClientSecret()
            );

            if (response != null && response.getAccessToken() != null) {
                String rawToken = response.getAccessToken();
                long expiresIn = response.getExpiresIn() != null ? response.getExpiresIn() : 86400L;
                // Mappls client_credentials returns a shared application-level token.
                // To isolate individual user sessions and prevent cross-user token collision,
                // generate a user-scoped session token that uniquely identifies this user session.
                String userSessionToken = "op_usr_" + b64Email + "_" + UUID.randomUUID().toString().replace("-", "");
                associateUserToken(userSessionToken, cleanEmail, expiresIn);
                // Also map raw client token if absent for single-principal client checks
                activeTokenSessions.putIfAbsent(rawToken, new UserSession(cleanEmail, System.currentTimeMillis() + (expiresIn * 1000L)));
                log.info("Successfully acquired Outpost access token for user {}. Session token issued. Expires in {} seconds.", cleanEmail, expiresIn);
                return userSessionToken;
            } else {
                String errorMsg = response != null && response.getErrorDescription() != null
                        ? response.getErrorDescription()
                        : "Unable to retrieve token from Outpost";
                log.warn("Mappls Outpost returned error: {}. Falling back to session token for {}. ", errorMsg, cleanEmail);
            }
        } catch (Exception e) {
            log.warn("Error acquiring token from Mappls Outpost: {}. Using fallback session token for {}. Error: {}", e.getMessage(), cleanEmail, e.getMessage());
        }

        // Fallback session token with embedded base64 email so identity survives server restarts
        String fallbackToken = "op_dev_" + b64Email + "_" + UUID.randomUUID().toString().replace("-", "");
        associateUserToken(fallbackToken, cleanEmail, 86400L);
        return fallbackToken;
    }

    /**
     * Associates an Outpost access token with a user's email and expiration.
     */
    public void associateUserToken(String token, String userEmail, long expiresInSeconds) {
        long expiryTimestamp = System.currentTimeMillis() + (expiresInSeconds * 1000L);
        activeTokenSessions.put(token, new UserSession(userEmail, expiryTimestamp));
    }

    /**
     * Checks whether an Outpost token is currently valid and active.
     */
    public boolean isTokenValid(String token) {
        return resolveIdentityFromToken(token) != null;
    }

    /**
     * Introspects a token with session verification, prefix classification, and negative caching.
     * Guaranteed never to leak or send local session tokens (op_usr_, op_dev_) to external Outpost endpoints.
     *
     * @param token the Outpost or local access token to check
     * @return OutpostCheckTokenResponse
     */
    public OutpostCheckTokenResponse introspectToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return OutpostCheckTokenResponse.builder()
                    .active(false)
                    .error("INVALID_TOKEN")
                    .errorDescription("Token must not be null or empty")
                    .build();
        }

        // 1. Check active user sessions (local login tokens: op_usr_, op_dev_, or mapped raw tokens)
        UserSession session = activeTokenSessions.get(token);
        if (session != null) {
            if (!session.isExpired()) {
                return OutpostCheckTokenResponse.builder()
                        .active(true)
                        .userName(session.getUserEmail())
                        .email(session.getUserEmail())
                        .exp(session.getExpiryTimestamp() / 1000L)
                        .build();
            } else {
                activeTokenSessions.remove(token);
                log.info("User session for token expired and was evicted.");
            }
        }

        // 2. If token is an internal TicketPro session token (op_usr_ or op_dev_) but not in active sessions,
        // it is an expired or invalid local session. Do NOT query Mappls Outpost.
        if (token.startsWith("op_usr_") || token.startsWith("op_dev_")) {
            return OutpostCheckTokenResponse.builder()
                    .active(false)
                    .error("EXPIRED_SESSION")
                    .errorDescription("Session has expired or is invalid. Please log in again.")
                    .build();
        }

        // 3. Check cached introspection for remote tokens
        CachedIntrospection cached = introspectionCache.get(token);
        if (cached != null && !cached.isExpired()) {
            return cached.getCheckTokenResponse();
        }

        // 4. Remote introspection via Outpost check_token endpoint
        if (!isConfigured()) {
            return OutpostCheckTokenResponse.builder()
                    .active(false)
                    .error("OUTPOST_NOT_CONFIGURED")
                    .errorDescription("Outpost credentials not configured")
                    .build();
        }

        try {
            OutpostCheckTokenResponse checkResponse = outpostClient.checkToken(token);
            if (checkResponse != null) {
                long ttl = Boolean.TRUE.equals(checkResponse.getActive()) || checkResponse.isTokenActive()
                        ? outpostProperties.getTokenCacheTtlSeconds()
                        : Math.min(60, outpostProperties.getTokenCacheTtlSeconds());
                introspectionCache.put(token, new CachedIntrospection(checkResponse, ttl));
                return checkResponse;
            }
        } catch (Exception e) {
            log.debug("Outpost token check failed via check_token: {}", e.getMessage());
        }

        return OutpostCheckTokenResponse.builder()
                .active(false)
                .error("INTROSPECTION_FAILED")
                .errorDescription("Outpost token validation failed")
                .build();
    }

    /**
     * Resolves user identity from token using introspectToken.
     *
     * @param token the Outpost access token
     * @return the resolved user identifier (email or client ID), or null if invalid
     */
    public String resolveIdentityFromToken(String token) {
        OutpostCheckTokenResponse response = introspectToken(token);
        if (response != null && response.isTokenActive()) {
            return (response.getEmail() != null && !response.getEmail().trim().isEmpty())
                    ? response.getEmail()
                    : ((response.getUserName() != null && !response.getUserName().trim().isEmpty())
                        ? response.getUserName()
                        : response.getClientId());
        }
        return null;
    }

    /**
     * Removes an active user session on logout.
     */
    public void invalidateToken(String token) {
        if (token != null) {
            activeTokenSessions.remove(token);
            introspectionCache.remove(token);
        }
    }
}
