package com.ticketpro.api.service.outpost;

import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.outpost.OutpostTokenResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
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
 * Service dedicated to requesting and managing OAuth 2.0 access tokens from Outpost
 * using the configured Client ID, Client Secret, and credentials (client_credentials or password grant).
 *
 * Implements strict security: never logs tokens, secrets, or sensitive credentials.
 */
@Service
@Slf4j
public class OutpostTokenService {

    private final OutpostProperties outpostProperties;
    private final RestTemplate restTemplate;

    public OutpostTokenService(OutpostProperties outpostProperties, RestTemplateBuilder restTemplateBuilder) {
        this.outpostProperties = outpostProperties;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(outpostProperties.getConnectTimeoutMs()))
                .setReadTimeout(Duration.ofMillis(outpostProperties.getReadTimeoutMs()))
                .build();
    }

    /**
     * Requests an OAuth 2.0 access token from Outpost using server-configured credentials.
     *
     * @return OutpostTokenResponse containing access_token, expires_in, scope, token_type
     */
    public OutpostTokenResponse requestToken() {
        if (!outpostProperties.isConfigured()) {
            log.error("Outpost OAuth2 client is not configured. Missing credentials.");
            throw new IllegalStateException("Outpost credentials (OUTPOST_CLIENT_ID / OUTPOST_CLIENT_SECRET) are not configured.");
        }

        return requestToken(
                outpostProperties.getClientId(),
                outpostProperties.getClientSecret(),
                outpostProperties.getGrantType(),
                outpostProperties.getUsername(),
                outpostProperties.getPassword(),
                outpostProperties.getScope()
        );
    }

    /**
     * Requests an OAuth 2.0 access token using password grant type with explicit credentials.
     *
     * @param username user username / email
     * @param password user password
     * @return OutpostTokenResponse
     */
    public OutpostTokenResponse requestPasswordToken(String username, String password) {
        return requestToken(
                outpostProperties.getClientId(),
                outpostProperties.getClientSecret(),
                "password",
                username,
                password,
                outpostProperties.getScope()
        );
    }

    /**
     * Requests an OAuth 2.0 access token from Outpost with explicit parameters.
     */
    public OutpostTokenResponse requestToken(String clientId, String clientSecret, String grantType, String scope) {
        return requestToken(clientId, clientSecret, grantType, outpostProperties.getUsername(), outpostProperties.getPassword(), scope);
    }

    /**
     * Requests an OAuth 2.0 access token from Outpost with full parameters.
     */
    public OutpostTokenResponse requestToken(String clientId, String clientSecret, String grantType,
                                          String username, String password, String scope) {
        String tokenUrl = outpostProperties.getTokenUrl();
        String effectiveGrant = (grantType != null && !grantType.isBlank()) ? grantType : outpostProperties.getGrantType();
        log.info("Requesting OAuth2 access token from Outpost endpoint: {} (grant_type={})", tokenUrl, effectiveGrant);

        // Build URL query params
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

        // Basic Auth header
        if (clientId != null && clientSecret != null && !clientId.isBlank() && !clientSecret.isBlank()) {
            String credentials = clientId + ":" + clientSecret;
            String basic = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
            headers.set(HttpHeaders.AUTHORIZATION, "Basic " + basic);
        }

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", effectiveGrant);
        if ("password".equalsIgnoreCase(effectiveGrant)) {
            body.add("username", username != null ? username : "");
            body.add("password", password != null ? password : "");
        } else {
            if (username != null && !username.isBlank()) body.add("username", username);
            if (password != null && !password.isBlank()) body.add("password", password);
        }
        if (clientId != null && !clientId.isBlank()) body.add("client_id", clientId);
        if (clientSecret != null && !clientSecret.isBlank()) body.add("client_secret", clientSecret);
        if (scope != null && !scope.isBlank()) body.add("scope", scope);

        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<OutpostTokenResponse> response = restTemplate.postForEntity(
                    targetUri,
                    requestEntity,
                    OutpostTokenResponse.class
            );

            OutpostTokenResponse tokenResponse = response.getBody();
            if (response.getStatusCode().is2xxSuccessful() && tokenResponse != null) {
                if (tokenResponse.getAccessToken() != null && !tokenResponse.getAccessToken().isBlank()) {
                    log.info("Successfully received Outpost OAuth2 access token. Expires in: {}s",
                            tokenResponse.getExpiresIn() != null ? tokenResponse.getExpiresIn() : "unknown");
                    return tokenResponse;
                } else {
                    log.error("Outpost response 200 OK but access_token is empty or null.");
                    throw new IllegalStateException("Outpost response did not contain a valid access_token.");
                }
            } else {
                log.error("Outpost token request returned non-2xx status: {}", response.getStatusCode());
                throw new IllegalStateException("Outpost token request failed with HTTP " + response.getStatusCode());
            }
        } catch (HttpStatusCodeException e) {
            log.error("Outpost token endpoint returned HTTP error status: {}", e.getStatusCode());
            throw new IllegalStateException("Outpost authentication failed: HTTP " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (ResourceAccessException e) {
            log.error("Network or timeout error contacting Outpost token endpoint: {}", e.getMessage());
            throw new IllegalStateException("Outpost token endpoint is unreachable or timed out.", e);
        } catch (Exception e) {
            log.error("Unexpected error during Outpost token acquisition: {}", e.getMessage());
            throw new IllegalStateException("Failed to acquire token from Outpost: " + e.getMessage(), e);
        }
    }
}
