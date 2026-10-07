package com.ticketpro.api.controller.outpost;

import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.outpost.AnchorUserRequest;
import com.ticketpro.api.dto.outpost.AnchorUserResponse;
import com.ticketpro.api.dto.outpost.OutpostCheckTokenResponse;
import com.ticketpro.api.dto.outpost.OutpostTokenRequest;
import com.ticketpro.api.dto.outpost.OutpostTokenResponse;
import com.ticketpro.api.service.outpost.MapplsAnchorClient;
import com.ticketpro.api.service.outpost.OutpostAuthService;
import com.ticketpro.api.service.outpost.OutpostClient;
import com.ticketpro.api.service.outpost.OutpostTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for Outpost authentication diagnostics, token generation,
 * token inspection, and Mappls Anchor user provisioning.
 */
@RestController
@RequestMapping("/api/outpost")
@RequiredArgsConstructor
@Slf4j
public class OutpostAuthController {

    private final OutpostAuthService outpostAuthService;
    private final OutpostClient outpostClient;
    private final OutpostTokenService outpostTokenService;
    private final MapplsAnchorClient mapplsAnchorClient;
    private final OutpostProperties outpostProperties;

    /**
     * Diagnostic endpoint to check Outpost configuration and active sessions.
     * GET /api/outpost/status (Public health status check)
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(outpostAuthService.getStatus());
    }

    /**
     * Inspect / check an Outpost access token against Outpost check_token endpoint.
     * Supports both GET and POST with query params, form-data, or JSON body.
     * Matches:
     * curl --location 'https://outpost.mappls.com/api/security/oauth/check_token' \
     * --form 'token="08677568-0542-43a2-8a5b-d459a31ecbf5"' \
     * --form 'api="ast1717396434i298196169"'
     */
    @RequestMapping(value = "/check-token", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<OutpostCheckTokenResponse> checkToken(
            @RequestParam(name = "token", required = false) String token,
            @RequestParam(name = "api", required = false) String api,
            @RequestBody(required = false) Map<String, String> body) {

        String effectiveToken = token;
        String effectiveApi = api;

        if ((effectiveToken == null || effectiveToken.isBlank()) && body != null) {
            effectiveToken = body.get("token");
        }
        if ((effectiveApi == null || effectiveApi.isBlank()) && body != null) {
            effectiveApi = body.get("api");
        }

        if (effectiveToken == null || effectiveToken.isBlank()) {
            return ResponseEntity.badRequest().body(
                    OutpostCheckTokenResponse.builder()
                            .active(false)
                            .error("MISSING_TOKEN")
                            .errorDescription("Token is required in query param, form field, or request body.")
                            .build()
            );
        }

        return ResponseEntity.ok(outpostClient.checkToken(effectiveToken, effectiveApi));
    }

    /**
     * Outpost OAuth 2.0 token generation endpoint.
     * Matches:
     * curl --location --request POST 'https://outpost.mappls.com/api/security/oauth/token?grant_type=password&username=&password=&client_id=%3D%3D&client_secret='
     *
     * Accepts explicit parameters in query string or JSON body, falling back to server-configured credentials.
     */
    @PostMapping("/token")
    public ResponseEntity<?> generateOutpostToken(
            @RequestParam(name = "grant_type", required = false) String grantTypeParam,
            @RequestParam(name = "username", required = false) String username,
            @RequestParam(name = "password", required = false) String password,
            @RequestParam(name = "client_id", required = false) String clientIdParam,
            @RequestParam(name = "client_secret", required = false) String clientSecretParam,
            @RequestParam(name = "scope", required = false) String scope,
            @RequestBody(required = false) OutpostTokenRequest requestBody) {

        String effectiveGrant = grantTypeParam;
        String effectiveUsername = username;
        String effectivePassword = password;
        String effectiveClientId = clientIdParam;
        String effectiveClientSecret = clientSecretParam;
        String effectiveScope = scope;

        if (requestBody != null) {
            if (requestBody.getGrantType() != null && !requestBody.getGrantType().isBlank()) effectiveGrant = requestBody.getGrantType();
            if (requestBody.getUsername() != null && !requestBody.getUsername().isBlank()) effectiveUsername = requestBody.getUsername();
            if (requestBody.getPassword() != null && !requestBody.getPassword().isBlank()) effectivePassword = requestBody.getPassword();
            if (requestBody.getClientId() != null && !requestBody.getClientId().isBlank()) effectiveClientId = requestBody.getClientId();
            if (requestBody.getClientSecret() != null && !requestBody.getClientSecret().isBlank()) effectiveClientSecret = requestBody.getClientSecret();
            if (requestBody.getScope() != null && !requestBody.getScope().isBlank()) effectiveScope = requestBody.getScope();
        }

        // Fallback to configured properties if not supplied in request
        if (effectiveClientId == null || effectiveClientId.isBlank()) effectiveClientId = outpostProperties.getClientId();
        if (effectiveClientSecret == null || effectiveClientSecret.isBlank()) effectiveClientSecret = outpostProperties.getClientSecret();
        if (effectiveGrant == null || effectiveGrant.isBlank()) effectiveGrant = outpostProperties.getGrantType();
        if (effectiveUsername == null || effectiveUsername.isBlank()) effectiveUsername = outpostProperties.getUsername();
        if (effectivePassword == null || effectivePassword.isBlank()) effectivePassword = outpostProperties.getPassword();
        if (effectiveScope == null || effectiveScope.isBlank()) effectiveScope = outpostProperties.getScope();

        try {
            OutpostTokenResponse response = outpostTokenService.requestToken(
                    effectiveClientId,
                    effectiveClientSecret,
                    effectiveGrant,
                    effectiveUsername,
                    effectivePassword,
                    effectiveScope
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("error", "TOKEN_REQUEST_FAILED");
            err.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(err);
        }
    }

    /**
     * Direct endpoint to create a user on Mappls Anchor.
     * Matches:
     * curl --location 'https://anchor.mappls.com/api/users/' \
     * --header 'authorization: bearer 33b53c49-0e1e-4e82-afce-51e988ab2e43' \
     * --header 'content-type: application/json' \
     * --data-raw '{"name":"TestUser","usernamesws":"testuse11r@example.com","email":"tesadr012@example.com","password":"mapplsQ1234"}'
     */
    @PostMapping("/anchor/users")
    public ResponseEntity<AnchorUserResponse> createAnchorUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody AnchorUserRequest request) {

        log.info("Request to create user on Mappls Anchor for: {}", request.getEmail());
        AnchorUserResponse response;
        if (authHeader != null && !authHeader.isBlank()) {
            response = mapplsAnchorClient.createUser(authHeader, request);
        } else {
            response = mapplsAnchorClient.createUser(request);
        }

        if (Boolean.TRUE.equals(response.getSuccess())) {
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(response);
        }
    }
}
