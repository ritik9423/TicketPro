package com.ticketpro.api.controller;

import com.ticketpro.api.dto.AuditLogResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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

/**
 * Enterprise Multi-Tenant Audit Log Controller.
 * Provides immutable activity trail inspection strictly scoped to tenant boundaries.
 */
@RestController
@RequestMapping(path = {"/api/v1/audit-logs", "/api/audit-logs"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Audit Logs", description = "Immutable system activity, security events, and compliance audit trail.")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Get audit logs",
            description = "Retrieves a paginated activity log strictly scoped to tenant boundaries. Super Admins can filter by companyId."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Audit logs retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request or pagination arguments", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires SUPER_ADMIN or COMPANY_ADMIN role", content = @Content)
    })
    public ResponseEntity<PagedResponse<AuditLogResponse>> getAuditLogs(
            @Parameter(description = "Optional tenant filter (Super Admins only)", example = "1")
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PagedResponse<AuditLogResponse> logs = auditLogService.getAuditLogsPaged(companyId, userDetails, pageable);
        return ResponseEntity.ok(logs);
    }
}
