package com.ticketpro.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Enterprise Health & Diagnostics Controller.
 * Provides public health check for load balancers and container orchestrators.
 */
@RestController
@RequestMapping(path = {"/api/v1/health", "/api/health", "/health"})
@Validated
@Tag(name = "Health & Diagnostics", description = "Endpoints for container liveness probes and uptime verification.")
public class HealthController {

    @GetMapping
    @Operation(
            summary = "Service health probe",
            description = "Returns current application liveness, service identifier, UTC timestamp, and build version."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Service is operational and healthy")
    })
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> health = Map.of(
                "status", "UP",
                "service", "TicketPro Multi-Tenant SaaS API",
                "timestamp", Instant.now().toString(),
                "version", "1.0.0-PROD"
        );
        return ResponseEntity.ok(health);
    }
}
