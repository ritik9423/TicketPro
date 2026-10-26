package com.ticketpro.api.controller.outpost;

import com.ticketpro.api.dto.outpost.AnchorUserRequest;
import com.ticketpro.api.dto.outpost.AnchorUserResponse;
import com.ticketpro.api.service.outpost.MapplsAnchorClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
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

/**
 * Enterprise-grade REST Controller for Mappls Anchor user synchronization and provisioning.
 */
@RestController
@RequestMapping(path = {"/api/v1/anchor", "/api/anchor"})
@RequiredArgsConstructor
@Validated
@Slf4j
@Tag(name = "Anchor Users", description = "Endpoints for Mappls Anchor identity synchronization and staff account provisioning")
@SecurityRequirement(name = "bearerAuth")
public class AnchorUserController {

    private final MapplsAnchorClient anchorClient;

    @Operation(summary = "Create user on Mappls Anchor", 
               description = "Provisions or synchronizes a user account into Mappls Anchor. Automatically acquires bearer token if header omitted.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Anchor user created successfully",
                    content = @Content(schema = @Schema(implementation = AnchorUserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid anchor user payload"),
            @ApiResponse(responseCode = "502", description = "Bad Gateway - Anchor upstream service failed")
    })
    @PostMapping("/users")
    public ResponseEntity<AnchorUserResponse> createUser(
            @Parameter(description = "Optional custom Bearer token for Mappls Anchor API")
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody AnchorUserRequest request
    ) {
        log.info("Received request to create user on Mappls Anchor for: {}", request.getEmail());
        AnchorUserResponse response;
        if (authHeader != null && !authHeader.isBlank()) {
            response = anchorClient.createUser(authHeader, request);
        } else {
            response = anchorClient.createUser(request);
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
