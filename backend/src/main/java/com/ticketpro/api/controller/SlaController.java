package com.ticketpro.api.controller;

import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.dto.SlaPolicyResponse;
import com.ticketpro.api.dto.SlaRequest;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.SlaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

/**
 * Enterprise Service Level Agreement (SLA) Policy Controller.
 * Manages resolution deadlines, first-response targets, and automated escalation timers.
 */
@RestController
@RequestMapping(path = {"/api/v1/sla", "/api/v1/sla-policies", "/api/sla", "/api/sla-policies"})
@RequiredArgsConstructor
@Validated
@Tag(name = "SLA Policies", description = "Endpoints for defining service level agreements, escalation tiers, and response time policies.")
public class SlaController {

    private final SlaService slaService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get SLA policies",
            description = "Retrieves paginated SLA policies configured for the caller's organization. Super Admins view all system-wide policies."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "SLA policies retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid pagination parameters", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content)
    })
    public ResponseEntity<PagedResponse<SlaPolicyResponse>> getSlaPolicies(
            @PageableDefault(size = 20, sort = "priority", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PagedResponse<SlaPolicyResponse> policies = slaService.getSlaPoliciesPaged(userDetails, pageable);
        return ResponseEntity.ok(policies);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Create SLA policy",
            description = "Creates a new SLA commitment policy for priority-based response and resolution deadlines."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "SLA policy created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = SlaPolicyResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed for SLA policy", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires ADMIN role", content = @Content)
    })
    public ResponseEntity<SlaPolicyResponse> createSlaPolicy(
            @Valid @RequestBody SlaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        SlaPolicyResponse created = slaService.createSlaPolicy(request, userDetails);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Update SLA policy",
            description = "Modifies response time targets, resolution thresholds, or active status of an SLA policy."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "SLA policy updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = SlaPolicyResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or invalid ID", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "SLA policy not found", content = @Content)
    })
    public ResponseEntity<SlaPolicyResponse> updateSlaPolicy(
            @Parameter(description = "ID of the SLA policy to update", required = true, example = "5")
            @PathVariable("id")
            @Positive(message = "SLA policy ID must be a positive integer") Long id,
            @Valid @RequestBody SlaRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        SlaPolicyResponse updated = slaService.updateSlaPolicy(id, request, userDetails);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Delete SLA policy",
            description = "Deletes an SLA policy permanently after verifying tenant ownership."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "SLA policy deleted successfully (no content)"),
            @ApiResponse(responseCode = "400", description = "Invalid ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "SLA policy not found", content = @Content)
    })
    public ResponseEntity<Void> deleteSlaPolicy(
            @Parameter(description = "ID of the SLA policy to delete", required = true, example = "5")
            @PathVariable("id")
            @Positive(message = "SLA policy ID must be a positive integer") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        slaService.deleteSlaPolicy(id, userDetails);
        return ResponseEntity.noContent().build();
    }
}
