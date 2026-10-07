package com.ticketpro.api.controller;

import com.ticketpro.api.dto.InboundEmailRequest;
import com.ticketpro.api.dto.InboundEmailResponse;
import com.ticketpro.api.service.InboundEmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/inbound/email")
public class InboundEmailController {

    private final InboundEmailService inboundEmailService;

    @Value("${ticketpro.inbound.secret:}")
    private String configuredSecret;

    public InboundEmailController(InboundEmailService inboundEmailService) {
        this.inboundEmailService = inboundEmailService;
    }

    /**
     * Webhook endpoint for inbound email ingestion (SendGrid, Mailgun, AWS SES, Postmark, etc.)
     * SECURITY H-1: Secret is now mandatory — rejects all requests when no secret is configured.
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleInboundEmailWebhook(
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret,
            @RequestBody InboundEmailRequest request) {
        
        // SECURITY H-1: Reject ALL webhook requests when no secret is configured
        if (configuredSecret == null || configuredSecret.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Inbound email webhook is disabled: no secret configured.");
        }
        if (!configuredSecret.equals(webhookSecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid or missing X-Webhook-Secret header.");
        }

        InboundEmailResponse response = inboundEmailService.processInboundEmail(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Manual ingestion endpoint for internal testing — requires SUPER_ADMIN authentication.
     * SECURITY H-1: Access restricted to SUPER_ADMIN role.
     */
    @PostMapping("/process")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<InboundEmailResponse> processInboundEmailDirect(@RequestBody InboundEmailRequest request) {
        InboundEmailResponse response = inboundEmailService.processInboundEmail(request);
        return ResponseEntity.ok(response);
    }
}
