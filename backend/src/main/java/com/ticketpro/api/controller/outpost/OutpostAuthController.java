package com.ticketpro.api.controller.outpost;

import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.outpost.AnchorUserRequest;
import com.ticketpro.api.dto.outpost.AnchorUserResponse;
import com.ticketpro.api.dto.outpost.OutpostCheckTokenResponse;
import com.ticketpro.api.dto.outpost.OutpostStatusResponse;
import com.ticketpro.api.dto.outpost.OutpostTokenRequest;
import com.ticketpro.api.dto.outpost.OutpostTokenResponse;
import com.ticketpro.api.service.outpost.MapplsAnchorClient;
import com.ticketpro.api.service.outpost.OutpostAuthService;
import com.ticketpro.api.service.outpost.OutpostClient;
import com.ticketpro.api.service.outpost.OutpostTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Map;

/**
 * Enterprise-grade REST Controller for Outpost OAuth 2.0 diagnostics, token generation, and introspection.
 */
@RestController
@RequestMapping(path = {"/api/v1/outpost", "/api/outpost"})
@RequiredArgsConstructor
@Validated
@Slf4j
@Tag(name = "Outpost Auth", description = "Endpoints for Outpost OAuth 2.0 token generation, introspection diagnostics, and Anchor integration")
public class OutpostAuthController {

    private final OutpostAuthService outpostAuthService;
    private final OutpostClient outpostClient;
    private final OutpostTokenService outpostTokenService;
    private final MapplsAnchorClient mapplsAnchorClient;
    private final OutpostProperties outpostProperties;

    @Operation(summary = "Get Outpost integration diagnostic status", 
               description = "Returns current status of Outpost credentials, active sessions, and cached token introspections.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Diagnostics retrieved successfully",
                    content = @Content(schema = @Schema(implementation = OutpostStatusResponse.class)))
    })
    @GetMapping("/status")
    public ResponseEntity<OutpostStatusResponse> getStatus() {
        return ResponseEntity.ok(outpostAuthService.getStatusDto());
    }

    @Operation(summary = "Introspect and check an Outpost access token", 
               description = "Validates an Outpost token via query parameter, form field, or JSON request body.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Token checked",
                    content = @Content(schema = @Schema(implementation = OutpostCheckTokenResponse.class))),
            @ApiResponse(responseCode = "400", description = "Token parameter missing")
    })
    @RequestMapping(value = "/check-token", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<OutpostCheckTokenResponse> checkToken(
            @Parameter(description = "Outpost token to check")
            @RequestParam(name = "token", required = false) String token,
            @Parameter(description = "API identifier")
            @RequestParam(name = "api", required = false) String api,
            @RequestBody(required = false) Map<String, String> body
    ) {
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

    @Operation(summary = "Generate Outpost OAuth 2.0 token", 
               description = "Requests an access token using OAuth 2.0 password or client credentials grant.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Token issued successfully",
                    content = @Content(schema = @Schema(implementation = OutpostTokenResponse.class))),
            @ApiResponse(responseCode = "502", description = "Outpost upstream service returned an error")
    })
    @PostMapping("/token")
    public ResponseEntity<OutpostTokenResponse> generateOutpostToken(
            @RequestParam(name = "grant_type", required = false) String grantTypeParam,
            @RequestParam(name = "username", required = false) String username,
            @RequestParam(name = "password", required = false) String password,
            @RequestParam(name = "client_id", required = false) String clientIdParam,
            @RequestParam(name = "client_secret", required = false) String clientSecretParam,
            @RequestParam(name = "scope", required = false) String scope,
            @RequestBody(required = false) OutpostTokenRequest requestBody
    ) {
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

        if (effectiveClientId == null || effectiveClientId.isBlank()) effectiveClientId = outpostProperties.getClientId();
        if (effectiveClientSecret == null || effectiveClientSecret.isBlank()) effectiveClientSecret = outpostProperties.getClientSecret();
        if (effectiveGrant == null || effectiveGrant.isBlank()) effectiveGrant = outpostProperties.getGrantType();
        if (effectiveUsername == null || effectiveUsername.isBlank()) effectiveUsername = outpostProperties.getUsername();
        if (effectivePassword == null || effectivePassword.isBlank()) effectivePassword = outpostProperties.getPassword();
        if (effectiveScope == null || effectiveScope.isBlank()) effectiveScope = outpostProperties.getScope();

        OutpostTokenResponse response = outpostTokenService.requestToken(
                effectiveClientId,
                effectiveClientSecret,
                effectiveGrant,
                effectiveUsername,
                effectivePassword,
                effectiveScope
        );
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Create user on Mappls Anchor", 
               description = "Creates staff account on Mappls Anchor via Outpost gateway.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Anchor user created successfully",
                    content = @Content(schema = @Schema(implementation = AnchorUserResponse.class))),
            @ApiResponse(responseCode = "502", description = "Upstream Anchor service failure")
    })
    @PostMapping("/anchor/users")
    public ResponseEntity<AnchorUserResponse> createAnchorUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody AnchorUserRequest request
    ) {
        log.info("Request to create user on Mappls Anchor for: {}", request.getEmail());
        AnchorUserResponse response;
        if (authHeader != null && !authHeader.isBlank()) {
            response = mapplsAnchorClient.createUser(authHeader, request);
        } else {
            response = mapplsAnchorClient.createUser(request);
        }

        if (Boolean.TRUE.equals(response.getSuccess())) {
            URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/v1/anchor/users/{username}")
                    .buildAndExpand(request.getUsernamesws() != null ? request.getUsernamesws() : request.getEmail())
                    .toUri();
            return ResponseEntity.created(location).body(response);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(response);
        }
    }
}
