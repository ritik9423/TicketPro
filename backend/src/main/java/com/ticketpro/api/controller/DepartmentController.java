package com.ticketpro.api.controller;

import com.ticketpro.api.dto.DepartmentResponse;
import com.ticketpro.api.entity.Department;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.exception.ResourceNotFoundException;
import com.ticketpro.api.exception.TenantAccessDeniedException;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.DepartmentRepository;
import com.ticketpro.api.security.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Department Controller with strict multi-tenant isolation.
 * Non-SUPER_ADMIN users can ONLY access departments belonging to their own company.
 * Returns DepartmentResponse DTOs instead of raw JPA entities.
 */
@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private CompanyRepository companyRepository;

    public DepartmentController() {}

    public DepartmentController(DepartmentRepository departmentRepository, CompanyRepository companyRepository) {
        this.departmentRepository = departmentRepository;
        this.companyRepository = companyRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAllDepartments(
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "page", required = false) Integer page,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            org.springframework.data.domain.Pageable pageable) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long effectiveCompanyId = resolveCompanyId(userDetails, companyId);

        if (page != null) {
            org.springframework.data.domain.Page<Department> deptPage;
            if (effectiveCompanyId != null) {
                deptPage = departmentRepository.findByCompanyId(effectiveCompanyId, pageable);
            } else if (userDetails.getRole() == Role.SUPER_ADMIN) {
                deptPage = departmentRepository.findAll(pageable);
            } else {
                deptPage = org.springframework.data.domain.Page.empty();
            }
            return ResponseEntity.ok(com.ticketpro.api.dto.PagedResponse.from(deptPage, DepartmentResponse::from));
        }

        List<Department> departments;
        if (effectiveCompanyId != null) {
            departments = departmentRepository.findByCompanyId(effectiveCompanyId);
        } else if (userDetails.getRole() == Role.SUPER_ADMIN) {
            departments = departmentRepository.findAll();
        } else {
            return ResponseEntity.ok(List.of());
        }

        return ResponseEntity.ok(departments.stream().map(DepartmentResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<DepartmentResponse> createDepartment(
            @RequestBody Department department,
            @RequestParam(name = "companyId", required = false) Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // SECURITY: Never trust client-supplied company in request body for authenticated tenant users
        if (userDetails.getRole() != Role.SUPER_ADMIN) {
            Long userCompanyId = userDetails.getCompanyId();
            if (userCompanyId == null) {
                throw new SecurityException("User does not belong to any tenant company.");
            }
            if (companyId != null && !companyId.equals(userCompanyId)) {
                throw new SecurityException("Cross-tenant department creation is forbidden: caller company does not match query parameter.");
            }
            if (department.getCompany() != null && department.getCompany().getId() != null
                    && !department.getCompany().getId().equals(userCompanyId)) {
                throw new SecurityException("Cross-tenant department creation is forbidden: payload company does not match caller tenant.");
            }
            com.ticketpro.api.entity.Company company = companyRepository.findById(userCompanyId)
                    .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + userCompanyId));
            department.setCompany(company);
        } else {
            // SUPER_ADMIN flow
            Long effectiveCompanyId = resolveCompanyId(userDetails, companyId);
            if (effectiveCompanyId != null) {
                companyRepository.findById(effectiveCompanyId).ifPresent(department::setCompany);
            } else if (department.getCompany() != null && department.getCompany().getId() != null) {
                companyRepository.findById(department.getCompany().getId()).ifPresent(department::setCompany);
            }
        }

        if (department.getCompany() == null) {
            throw new IllegalArgumentException("Department must be associated with a valid company.");
        }

        Department saved = departmentRepository.save(department);
        return ResponseEntity.status(HttpStatus.CREATED).body(DepartmentResponse.from(saved));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentResponse> getDepartmentById(
            @PathVariable("id") Integer id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", Long.valueOf(id)));

        if (userDetails.getRole() != Role.SUPER_ADMIN) {
            Long userCompanyId = userDetails.getCompanyId();
            if (userCompanyId == null || dept.getCompany() == null || !dept.getCompany().getId().equals(userCompanyId)) {
                throw new TenantAccessDeniedException("Department", id);
            }
        }

        return ResponseEntity.ok(DepartmentResponse.from(dept));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<DepartmentResponse> updateDepartment(
            @PathVariable("id") Integer id,
            @RequestBody Department details,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", Long.valueOf(id)));

        // SECURITY: Enforce tenant ownership — non-SUPER_ADMINs cannot modify departments from other companies or null-company departments
        if (userDetails.getRole() != Role.SUPER_ADMIN) {
            Long userCompanyId = userDetails.getCompanyId();
            if (userCompanyId == null || dept.getCompany() == null || !dept.getCompany().getId().equals(userCompanyId)) {
                throw new TenantAccessDeniedException("Department", id);
            }
        }

        dept.setName(details.getName());
        dept.setCode(details.getCode());
        dept.setDescription(details.getDescription());
        if (details.getStatus() != null) {
            dept.setStatus(details.getStatus());
        }

        Department saved = departmentRepository.save(dept);
        return ResponseEntity.ok(DepartmentResponse.from(saved));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<Void> deleteDepartment(
            @PathVariable("id") Integer id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", Long.valueOf(id)));

        // SECURITY: Enforce tenant ownership
        if (userDetails.getRole() != Role.SUPER_ADMIN) {
            Long userCompanyId = userDetails.getCompanyId();
            if (userCompanyId == null || dept.getCompany() == null || !dept.getCompany().getId().equals(userCompanyId)) {
                throw new TenantAccessDeniedException("Department", id);
            }
        }

        departmentRepository.delete(dept);
        return ResponseEntity.noContent().build();
    }

    /**
     * Enforce strict tenant boundaries.
     * Non-SUPER_ADMIN users can NEVER access departments of other tenants.
     */
    private Long resolveCompanyId(CustomUserDetails userDetails, Long requestedCompanyId) {
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            return requestedCompanyId; // Super admins can specify any company
        }
        // Non-super-admins are always locked to their own company
        Long tenantCompanyId = userDetails.getCompanyId();
        if (tenantCompanyId == null && userDetails.getUser() != null && userDetails.getUser().getCompany() != null) {
            tenantCompanyId = userDetails.getUser().getCompany().getId();
        }
        return tenantCompanyId;
    }
}
