package com.ticketpro.api.controller;

import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.CompanyService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Billing Controller — MOCK IMPLEMENTATION.
 * Real payment gateway integration (Stripe/Razorpay) is NOT implemented.
 * Returns invoice placeholders derived from registered company metadata.
 *
 * @deprecated Replace with real billing gateway integration before production deployment.
 */
@Deprecated(since = "1.0", forRemoval = true)
@RestController
@RequestMapping("/api/billing")
@Slf4j
public class BillingController {

    private final CompanyService companyService;

    @Deprecated
    public BillingController(CompanyService companyService) {
        this.companyService = companyService;
    }

    @Deprecated
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getBillingHistory(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> response = new HashMap<>();
        response.put("billing_status", "MOCK_DATA");
        response.put("notice", "Billing gateway (Stripe/Razorpay) is not yet integrated. These are placeholder invoices derived from company metadata.");

        List<Map<String, Object>> invoices = new ArrayList<>();
        List<Company> companies = Collections.emptyList();

        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        boolean isSuperAdmin = userDetails.getRole() == Role.SUPER_ADMIN;

        if (isSuperAdmin) {
            companies = companyService.getAllCompanies();
        } else if (userDetails.getCompanyId() != null) {
            Company c = companyService.getCompanyById(userDetails.getCompanyId());
            companies = (c != null) ? List.of(c) : Collections.emptyList();
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy");

        if (companies != null) {
            for (Company comp : companies) {
                if (comp == null || comp.getId() == null) continue;
                Map<String, Object> inv = new HashMap<>();
                long compId = comp.getId();
                inv.put("id", "INV-2026-" + String.format("%04d", compId));
                inv.put("company", comp.getCompanyName() != null && !comp.getCompanyName().isBlank() ? comp.getCompanyName() : "Enterprise Client");
                inv.put("companyCode", comp.getCompanyCode() != null ? comp.getCompanyCode() : "TENANT");
                inv.put("plan", "Enterprise Scale");
                inv.put("amount", "$499.00");
                inv.put("date", comp.getCreatedAt() != null ? comp.getCreatedAt().format(formatter) : "N/A");
                inv.put("status", comp.getStatus() != null && "ACTIVE".equalsIgnoreCase(comp.getStatus().name()) ? "Paid" : "Pending");
                inv.put("paymentMethod", "Not configured — billing gateway pending");
                inv.put("mock", true);
                invoices.add(inv);
            }
        }

        response.put("invoices", invoices);
        return ResponseEntity.ok(response);
    }
}
