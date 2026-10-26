package com.ticketpro.api.controller;

import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Enterprise Dashboard Controller.
 * Aggregates role-tailored real-time metrics, workload distribution, and ticket KPI analytics.
 */
@RestController
@RequestMapping(path = {"/api/v1/dashboard", "/api/dashboard"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Dashboard", description = "Role-scoped analytics, tenant stats, SLA metrics, and operational performance.")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get aggregated dashboard statistics",
            description = "Returns role-specific KPI stats (Super Admin global overview, Company Admin tenant stats, Agent workload, or End User ticket summary)."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dashboard analytics retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Caller has invalid tenant or role context", content = @Content)
    })
    public ResponseEntity<Map<String, Object>> getDashboardStats(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> stats = dashboardService.getDashboardStats(userDetails);
        return ResponseEntity.ok(stats);
    }
}
