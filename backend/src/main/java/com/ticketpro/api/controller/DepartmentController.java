package com.ticketpro.api.controller;

import com.ticketpro.api.dto.DepartmentRequest;
import com.ticketpro.api.dto.DepartmentResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.DepartmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
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
import java.util.List;

/**
 * Enterprise Multi-Tenant Department Controller.
 * Manages organizational business units, skill groups, and ticket routing targets.
 * Purely delegates data persistence and tenant boundaries to {@link DepartmentService}.
 */
@RestController
@RequestMapping(path = {"/api/v1/departments", "/api/departments"})
@Validated
@Tag(name = "Departments", description = "Endpoints for organizational business units, support teams, and routing groups.")
public class DepartmentController {

    private final DepartmentService departmentService;

    @org.springframework.beans.factory.annotation.Autowired
    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    public DepartmentController(com.ticketpro.api.repository.DepartmentRepository departmentRepository, com.ticketpro.api.repository.CompanyRepository companyRepository) {
        this(new DepartmentService(departmentRepository, companyRepository));
    }

    // Legacy test-compatibility overloads
    public ResponseEntity<DepartmentResponse> createDepartment(com.ticketpro.api.entity.Department department, Long companyId, CustomUserDetails userDetails) {
        DepartmentRequest req = new DepartmentRequest();
        if (department != null) {
            req.setName(department.getName());
            req.setDescription(department.getDescription());
            req.setStatus(department.getStatus());
            if (department.getCompany() != null) {
                req.setCompanyId(department.getCompany().getId());
            }
        }
        return createDepartment(req, companyId, userDetails);
    }

    public ResponseEntity<DepartmentResponse> createDepartment(com.ticketpro.api.entity.Department department, CustomUserDetails userDetails) {
        return createDepartment(department, null, userDetails);
    }

    public ResponseEntity<DepartmentResponse> createDepartment(Long companyId, com.ticketpro.api.entity.Department department) {
        return createDepartment(department, companyId, null);
    }

    public ResponseEntity<DepartmentResponse> updateDepartment(Integer id, com.ticketpro.api.entity.Department department, CustomUserDetails userDetails) {
        DepartmentRequest req = new DepartmentRequest();
        if (department != null) {
            req.setName(department.getName());
            req.setDescription(department.getDescription());
            req.setStatus(department.getStatus());
            if (department.getCompany() != null) {
                req.setCompanyId(department.getCompany().getId());
            }
        }
        return updateDepartment(id, req, userDetails);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get departments",
            description = "Retrieves departments scoped to caller's organization. Super Admins can filter across tenants using companyId."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Departments retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = DepartmentResponse.class)))),
            @ApiResponse(responseCode = "400", description = "Invalid company ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content)
    })
    public ResponseEntity<List<DepartmentResponse>> getAllDepartments(
            @Parameter(description = "Optional company ID filter (Super Admins only)", example = "1")
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<DepartmentResponse> departments = departmentService.getDepartments(companyId, userDetails);
        return ResponseEntity.ok(departments);
    }

    @GetMapping("/paged")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get paginated departments",
            description = "Retrieves departments formatted in a standard server-side paginated envelope."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Departments retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content)
    })
    public ResponseEntity<PagedResponse<DepartmentResponse>> getDepartmentsPaged(
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PagedResponse<DepartmentResponse> page = departmentService.getDepartmentsPaged(companyId, userDetails, pageable);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get department by ID",
            description = "Retrieves a single department with multi-tenant access verification."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Department retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = DepartmentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid department ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    public ResponseEntity<DepartmentResponse> getDepartmentById(
            @Parameter(description = "ID of the department", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Department ID must be a positive integer") Integer id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DepartmentResponse dept = departmentService.getDepartmentById(id, userDetails);
        return ResponseEntity.ok(dept);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Create department",
            description = "Creates a new business department for routing tickets and associating agent teams."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Department created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = DepartmentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed for department body", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires ADMIN role", content = @Content)
    })
    public ResponseEntity<DepartmentResponse> createDepartment(
            @Valid @RequestBody DepartmentRequest request,
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DepartmentResponse created = departmentService.createDepartment(request, companyId, userDetails);
        URI location;
        try {
            location = ServletUriComponentsBuilder.fromCurrentRequest()
                    .path("/{id}")
                    .buildAndExpand(created.getId())
                    .toUri();
        } catch (Exception e) {
            location = URI.create("/api/v1/departments/" + created.getId());
        }
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Update department",
            description = "Modifies department name, code, description, or active status with tenant verification."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Department updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = DepartmentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or invalid ID", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    public ResponseEntity<DepartmentResponse> updateDepartment(
            @Parameter(description = "ID of the department to update", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Department ID must be a positive integer") Integer id,
            @Valid @RequestBody DepartmentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        DepartmentResponse updated = departmentService.updateDepartment(id, request, userDetails);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Delete department",
            description = "Deletes a department permanently after verifying tenant ownership."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Department deleted successfully (no content)"),
            @ApiResponse(responseCode = "400", description = "Invalid ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "Department not found", content = @Content)
    })
    public ResponseEntity<Void> deleteDepartment(
            @Parameter(description = "ID of the department to delete", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Department ID must be a positive integer") Integer id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        departmentService.deleteDepartment(id, userDetails);
        return ResponseEntity.noContent().build();
    }
}
