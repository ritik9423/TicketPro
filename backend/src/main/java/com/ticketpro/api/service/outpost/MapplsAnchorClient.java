package com.ticketpro.api.service.outpost;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.outpost.AnchorUserRequest;
import com.ticketpro.api.dto.outpost.AnchorUserResponse;
import com.ticketpro.api.dto.outpost.OutpostTokenResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;

/**
 * Service for communicating with Mappls Anchor API:
 * POST https://anchor.mappls.com/api/users/
 * Header: authorization: bearer <token>
 * Header: content-type: application/json
 * Body: {"name":"TestUser","usernamesws":"testuse11r@example.com","email":"tesadr012@example.com","password":"mapplsQ1234"}
 */
@Service
@Slf4j
public class MapplsAnchorClient {

    private final OutpostProperties outpostProperties;
    private final OutpostTokenService outpostTokenService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public MapplsAnchorClient(OutpostProperties outpostProperties,
                              OutpostTokenService outpostTokenService,
                              RestTemplateBuilder restTemplateBuilder,
                              ObjectMapper objectMapper) {
        this.outpostProperties = outpostProperties;
        this.outpostTokenService = outpostTokenService;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(outpostProperties.getConnectTimeoutMs()))
                .setReadTimeout(Duration.ofMillis(outpostProperties.getReadTimeoutMs()))
                .build();
        this.objectMapper = objectMapper;
    }

    /**
     * Creates a user in Mappls Anchor using an explicit Bearer token.
     * Matches:
     * curl --location 'https://anchor.mappls.com/api/users/' \
     * --header 'authorization: bearer 33b53c49-0e1e-4e82-afce-51e988ab2e43' \
     * --header 'content-type: application/json' \
     * --data-raw '{"name":"TestUser","usernamesws":"testuse11r@example.com","email":"tesadr012@example.com","password":"mapplsQ1234"}'
     *
     * @param bearerToken Outpost OAuth2 bearer token
     * @param request AnchorUserRequest payload
     * @return AnchorUserResponse
     */
    public AnchorUserResponse createUser(String bearerToken, AnchorUserRequest request) {
        String usersUrl = outpostProperties.getAnchorUsersUrl();
        log.info("Provisioning user on Mappls Anchor: {} (email: {}, usernamesws: {})",
                usersUrl, request.getEmail(), request.getUsernamesws());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        String authHeader = bearerToken != null ? bearerToken.trim() : "";
        if (!authHeader.toLowerCase().startsWith("bearer ")) {
            authHeader = "bearer " + authHeader;
        }
        headers.set("Authorization", authHeader);

        HttpEntity<AnchorUserRequest> httpEntity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(usersUrl, httpEntity, String.class);
            log.info("Mappls Anchor user creation returned status: {}", response.getStatusCode());

            Map<String, Object> rawMap = null;
            String responseBody = response.getBody();
            if (responseBody != null && !responseBody.isBlank()) {
                try {
                    rawMap = objectMapper.readValue(responseBody, new TypeReference<Map<String, Object>>() {});
                } catch (Exception ignored) {}
            }

            return AnchorUserResponse.builder()
                    .success(response.getStatusCode().is2xxSuccessful())
                    .status(response.getStatusCode().toString())
                    .message("User successfully created on Mappls Anchor")
                    .data(rawMap != null ? rawMap : responseBody)
                    .rawResponse(rawMap)
                    .build();

        } catch (HttpStatusCodeException e) {
            log.error("Mappls Anchor user creation failed [HTTP {}]: {}", e.getStatusCode(), e.getResponseBodyAsString());
            Map<String, Object> errorMap = null;
            try {
                errorMap = objectMapper.readValue(e.getResponseBodyAsString(), new TypeReference<Map<String, Object>>() {});
            } catch (Exception ignored) {}

            return AnchorUserResponse.builder()
                    .success(false)
                    .status("HTTP_" + e.getStatusCode().value())
                    .error("HTTP_" + e.getStatusCode().value())
                    .errorDescription(e.getResponseBodyAsString())
                    .rawResponse(errorMap)
                    .build();

        } catch (ResourceAccessException e) {
            log.error("Network or timeout contacting Mappls Anchor: {}", e.getMessage());
            return AnchorUserResponse.builder()
                    .success(false)
                    .status("ANCHOR_UNAVAILABLE")
                    .error("ANCHOR_UNAVAILABLE")
                    .errorDescription("Mappls Anchor service is unreachable or timed out: " + e.getMessage())
                    .build();

        } catch (Exception e) {
            log.error("Unexpected error creating user on Mappls Anchor: {}", e.getMessage());
            return AnchorUserResponse.builder()
                    .success(false)
                    .status("INTERNAL_ERROR")
                    .error("INTERNAL_ERROR")
                    .errorDescription(e.getMessage())
                    .build();
        }
    }

    /**
     * Creates a user on Mappls Anchor by automatically obtaining an OAuth token from Outpost.
     *
     * @param request AnchorUserRequest payload
     * @return AnchorUserResponse
     */
    public AnchorUserResponse createUser(AnchorUserRequest request) {
        log.info("Acquiring fresh Outpost OAuth token to create user on Mappls Anchor");
        OutpostTokenResponse tokenResponse = outpostTokenService.requestToken();
        String token = tokenResponse.getAccessToken();
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("Failed to obtain valid access token from Outpost to provision user in Mappls Anchor.");
        }
        return createUser(token, request);
    }
}
