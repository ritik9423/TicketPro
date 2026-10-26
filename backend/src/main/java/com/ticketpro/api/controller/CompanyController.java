package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CompanyRegisterRequest;
import com.ticketpro.api.dto.CompanyResponse;
import com.ticketpro.api.dto.CompanyUpdateRequest;
import com.ticketpro.api.dto.UserResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.CompanyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Enterprise Multi-Tenant Organization Controller.
 * Manages tenant registration, enterprise profiles, domain whitelists, and company administrator roles.
 */
@RestController
@RequestMapping(path = {"/api/v1/companies", "/api/companies"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Organizations", description = "Endpoints for enterprise client registration, tenant profiles, and account lifecycle management.")
public class CompanyController {

    private final CompanyService companyService;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminCredentialsRequest {
        @NotBlank(message = "Administrator name is required")
        private String name;

        @NotBlank(message = "Administrator email is required")
        @Email(message = "Invalid administrator email address")
        private String email;

        @NotBlank(message = "Initial temporary password is required")
        private String password;
    }

    @PostMapping({"/register-request", "/register"})
    @Operation(
            summary = "Register new organization tenant",
            description = "Submits an onboarding registration request for a new corporate tenant and provisions default categories."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Company registration created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = CompanyResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed for company registration payload", content = @Content),
            @ApiResponse(responseCode = "409", description = "Conflict - Company code or email already in use", content = @Content)
    })
    public ResponseEntity<CompanyResponse> registerCompanyRequest(@Valid @RequestBody CompanyRegisterRequest request) {
        Company saved = companyService.registerCompany(request);
        CompanyResponse response = CompanyResponse.from(saved);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get companies list",
            description = "Super Admins view all corporate tenants. Company Admins and Agents view only their own company."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Organizations retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = CompanyResponse.class)))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content)
    })
    public ResponseEntity<List<CompanyResponse>> getAllCompanies(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<CompanyResponse> companies = companyService.getCompanies(userDetails);
        return ResponseEntity.ok(companies);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get company by ID",
            description = "Retrieves company profile, theme customization, and tenant configurations with boundary isolation."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Company profile retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = CompanyResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid company ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant company profile access denied", content = @Content),
            @ApiResponse(responseCode = "404", description = "Company not found", content = @Content)
    })
    public ResponseEntity<CompanyResponse> getCompanyById(
            @Parameter(description = "ID of the company", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Company ID must be a positive integer") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        CompanyResponse company = companyService.getCompanyByIdWithCheck(id, userDetails);
        return ResponseEntity.ok(company);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Update company profile",
            description = "Updates branding, contact info, or operational preferences. Status transitions are restricted to Super Admins."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Company updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = CompanyResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or invalid ID", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Unauthorized profile update", content = @Content),
            @ApiResponse(responseCode = "404", description = "Company not found", content = @Content)
    })
    public ResponseEntity<CompanyResponse> updateCompany(
            @Parameter(description = "ID of the company to update", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Company ID must be a positive integer") Long id,
            @Valid @RequestBody CompanyUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        CompanyResponse updated = companyService.updateCompany(id, request, userDetails);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(
            summary = "Delete company (Super Admin)",
            description = "Permanently removes a corporate tenant along with cascade-isolated resources."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Company deleted successfully (no content)"),
            @ApiResponse(responseCode = "400", description = "Invalid ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires SUPER_ADMIN role", content = @Content),
            @ApiResponse(responseCode = "404", description = "Company not found", content = @Content)
    })
    public ResponseEntity<Void> deleteCompany(
            @Parameter(description = "ID of the company to delete", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Company ID must be a positive integer") Long id
    ) {
        companyService.deleteCompany(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(
            summary = "Get primary company administrator",
            description = "Retrieves the designated primary administrator account for a tenant."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Company admin retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires SUPER_ADMIN role", content = @Content),
            @ApiResponse(responseCode = "404", description = "Company not found", content = @Content)
    })
    public ResponseEntity<UserResponse> getCompanyAdmin(
            @Parameter(description = "ID of the company", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Company ID must be a positive integer") Long id
    ) {
        User admin = companyService.getCompanyAdmin(id);
        return ResponseEntity.ok(admin != null ? UserResponse.from(admin) : null);
    }

    @PostMapping("/{id}/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(
            summary = "Assign primary company administrator",
            description = "Creates or reassigns the primary administrator credentials for a tenant."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Company admin assigned successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed for admin credentials", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires SUPER_ADMIN role", content = @Content)
    })
    public ResponseEntity<UserResponse> setCompanyAdmin(
            @Parameter(description = "ID of the company", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Company ID must be a positive integer") Long id,
            @Valid @RequestBody AdminCredentialsRequest request
    ) {
        User admin = companyService.setCompanyAdmin(id, request.getName(), request.getEmail(), request.getPassword());
        return ResponseEntity.ok(admin != null ? UserResponse.from(admin) : null);
    }
}
