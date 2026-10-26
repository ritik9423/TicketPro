package com.ticketpro.api.controller;

import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.CompanyService;
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
 * Enterprise Multi-Tenant Billing Controller.
 * Provides invoice history and subscription status metadata.
 */
@RestController
@RequestMapping(path = {"/api/v1/billing", "/api/billing"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Billing", description = "Tenant subscription tier metadata and invoice generation history.")
public class BillingController {

    private final CompanyService companyService;

    @GetMapping("/history")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get billing and invoice history",
            description = "Retrieves current billing tier metadata and past invoice records for caller's organization."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Billing history retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant access denied", content = @Content)
    })
    public ResponseEntity<Map<String, Object>> getBillingHistory(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> history = companyService.getBillingHistory(userDetails);
        return ResponseEntity.ok(history);
    }
}
