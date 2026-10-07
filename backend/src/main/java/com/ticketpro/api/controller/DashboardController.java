package com.ticketpro.api.controller;

import com.ticketpro.api.entity.Role;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.DashboardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboardStats(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "FORBIDDEN",
                    "message", "Dashboard statistics require an authenticated user identity."
            ));
        }

        Role role = userDetails.getRole();
        Long userId = userDetails.getId();
        Long companyId = userDetails.getCompanyId();

        if (role == Role.SUPER_ADMIN) {
            return ResponseEntity.ok(dashboardService.getSuperAdminDashboard());
        } else if (role == Role.COMPANY_ADMIN || role == Role.MANAGER) {
            return ResponseEntity.ok(dashboardService.getCompanyAdminDashboard(companyId));
        } else if (role == Role.AGENT) {
            return ResponseEntity.ok(dashboardService.getAgentDashboard(userId, companyId));
        } else {
            return ResponseEntity.ok(dashboardService.getEndUserDashboard(userId, companyId));
        }
    }
}
