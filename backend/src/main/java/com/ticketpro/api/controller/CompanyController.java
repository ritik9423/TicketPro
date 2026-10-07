package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CompanyResponse;
import com.ticketpro.api.dto.CompanyUpdateRequest;
import com.ticketpro.api.dto.UserResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.CompanyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

import com.ticketpro.api.dto.CompanyRegisterRequest;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;

/**
 * Company Controller — returns CompanyResponse DTOs.
 * All exceptions flow to GlobalExceptionHandler.
 */
@RestController
@RequestMapping("/api/companies")
public class CompanyController {

    private final CompanyService companyService;

    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    @Getter
    @Setter
    public static class AdminCredentialsRequest {
        private String name;
        private String email;
        private String password;
    }

    @PostMapping({"/register-request", "/register"})
    public ResponseEntity<CompanyResponse> registerCompanyRequest(@Valid @RequestBody CompanyRegisterRequest request) {
        Company saved = companyService.registerCompany(request);
        return ResponseEntity.ok(CompanyResponse.from(saved));
    }

    @GetMapping
    public ResponseEntity<List<CompanyResponse>> getAllCompanies(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null && userDetails.getRole() != Role.SUPER_ADMIN) {
            Long companyId = userDetails.getCompanyId();
            if (companyId != null) {
                Company company = companyService.getCompanyById(companyId);
                return ResponseEntity.ok(company != null ? List.of(CompanyResponse.from(company)) : Collections.emptyList());
            }
            return ResponseEntity.ok(Collections.emptyList());
        }
        return ResponseEntity.ok(companyService.getAllCompanies().stream().map(CompanyResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CompanyResponse> getCompanyById(@PathVariable("id") Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (userDetails.getRole() != Role.SUPER_ADMIN) {
            if (userDetails.getCompanyId() == null || !userDetails.getCompanyId().equals(id)) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: You do not have permission to view this organization.");
            }
        }
        return ResponseEntity.ok(CompanyResponse.from(companyService.getCompanyById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<CompanyResponse> updateCompany(@PathVariable("id") Long id, @RequestBody CompanyUpdateRequest request, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // SECURITY C-4: Only SUPER_ADMIN can change company status
        if (request.getStatus() != null && userDetails.getRole() != Role.SUPER_ADMIN) {
            throw new SecurityException("Only Super Admin can change company status.");
        }
        Long targetId;
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            targetId = id;
        } else {
            if (userDetails.getCompanyId() == null || !userDetails.getCompanyId().equals(id)) {
                throw new org.springframework.security.access.AccessDeniedException("Access denied: You cannot update another organization's profile.");
            }
            targetId = userDetails.getCompanyId();
        }
        return ResponseEntity.ok(CompanyResponse.from(companyService.updateCompany(targetId, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteCompany(@PathVariable("id") Long id) {
        companyService.deleteCompany(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> getCompanyAdmin(@PathVariable("id") Long id) {
        User admin = companyService.getCompanyAdmin(id);
        return ResponseEntity.ok(admin != null ? UserResponse.from(admin) : null);
    }

    @PostMapping("/{id}/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> setCompanyAdmin(@PathVariable("id") Long id, @Valid @RequestBody AdminCredentialsRequest request) {
        User admin = companyService.setCompanyAdmin(id, request.getName(), request.getEmail(), request.getPassword());
        return ResponseEntity.ok(admin != null ? UserResponse.from(admin) : null);
    }
}
