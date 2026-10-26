package com.ticketpro.api.controller;

import com.ticketpro.api.dto.InboundEmailRequest;
import com.ticketpro.api.dto.InboundEmailResponse;
import com.ticketpro.api.service.InboundEmailService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Enterprise Inbound Email Integration Controller.
 * Ingests external webhook payloads from ESPs (SendGrid, Mailgun, AWS SES, Postmark)
 * and dispatches them into automated ticket creation pipelines.
 */
@RestController
@RequestMapping(path = {"/api/v1/inbound/email", "/api/inbound/email"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Inbound Email", description = "Endpoints for external email provider webhooks and simulated message ingestion.")
public class InboundEmailController {

    private final InboundEmailService inboundEmailService;

    @Value("${ticketpro.inbound.secret:}")
    private String configuredSecret;

    /**
     * Webhook endpoint for inbound email ingestion.
     * Validates secret signature header before invoking processing pipeline.
     */
    @PostMapping("/webhook")
    @Operation(
            summary = "Ingest inbound email webhook",
            description = "Receives parsed incoming emails from mail delivery providers and creates or appends to existing tickets."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email processed successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = InboundEmailResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or inbound webhook service unconfigured", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Missing or invalid webhook secret", content = @Content)
    })
    public ResponseEntity<InboundEmailResponse> handleInboundEmailWebhook(
            @Parameter(description = "Shared secret header configured in webhook provider", example = "secret_key_123")
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret,
            @Valid @RequestBody InboundEmailRequest request
    ) {
        if (configuredSecret == null || configuredSecret.isBlank()) {
            throw new IllegalStateException("Inbound email webhook is disabled: no secret configured.");
        }
        if (!configuredSecret.equals(webhookSecret)) {
            throw new AccessDeniedException("Invalid or missing X-Webhook-Secret header.");
        }

        InboundEmailResponse response = inboundEmailService.processInboundEmail(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Manual ingestion endpoint for internal testing — requires SUPER_ADMIN authentication.
     */
    @PostMapping("/process")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(
            summary = "Manually process email payload (Super Admin)",
            description = "Simulates an incoming email payload directly for system diagnostics or manual replay."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Email processed successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = InboundEmailResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed for email payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires SUPER_ADMIN role", content = @Content)
    })
    public ResponseEntity<InboundEmailResponse> processInboundEmailDirect(
            @Valid @RequestBody InboundEmailRequest request
    ) {
        InboundEmailResponse response = inboundEmailService.processInboundEmail(request);
        return ResponseEntity.ok(response);
    }
}
