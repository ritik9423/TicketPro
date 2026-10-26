package com.ticketpro.api.service;

import com.ticketpro.api.dto.DepartmentRequest;
import com.ticketpro.api.dto.DepartmentResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Department;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.exception.ResourceNotFoundException;
import com.ticketpro.api.exception.TenantAccessDeniedException;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.DepartmentRepository;
import com.ticketpro.api.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Enterprise Service for Multi-Tenant Department Management.
 * Encapsulates tenant isolation, access authorization, and lifecycle rules.
 */
@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getDepartments(Long companyId, CustomUserDetails userDetails) {
        Long effectiveCompanyId = resolveCompanyId(userDetails, companyId);
        List<Department> departments;
        if (effectiveCompanyId != null) {
            departments = departmentRepository.findByCompanyId(effectiveCompanyId);
        } else if (userDetails != null && userDetails.getRole() == Role.SUPER_ADMIN) {
            departments = departmentRepository.findAll();
        } else {
            return List.of();
        }
        return departments.stream().map(DepartmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<DepartmentResponse> getDepartmentsPaged(Long companyId, CustomUserDetails userDetails, Pageable pageable) {
        Long effectiveCompanyId = resolveCompanyId(userDetails, companyId);
        Page<Department> deptPage;
        if (effectiveCompanyId != null) {
            deptPage = departmentRepository.findByCompanyId(effectiveCompanyId, pageable);
        } else if (userDetails != null && userDetails.getRole() == Role.SUPER_ADMIN) {
            deptPage = departmentRepository.findAll(pageable);
        } else {
            deptPage = Page.empty(pageable);
        }
        return PagedResponse.from(deptPage, DepartmentResponse::from);
    }

    @Transactional(readOnly = true)
    public DepartmentResponse getDepartmentById(Integer id, CustomUserDetails userDetails) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", Long.valueOf(id)));

        if (userDetails != null && userDetails.getRole() != Role.SUPER_ADMIN) {
            Long userCompanyId = userDetails.getCompanyId();
            if (userCompanyId == null || dept.getCompany() == null || !dept.getCompany().getId().equals(userCompanyId)) {
                throw new TenantAccessDeniedException("Department", id);
            }
        }

        return DepartmentResponse.from(dept);
    }

    @Transactional
    public DepartmentResponse createDepartment(DepartmentRequest request, Long queryCompanyId, CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("Authentication is required to create a department.");
        }

        Company company;
        if (userDetails.getRole() != Role.SUPER_ADMIN) {
            Long userCompanyId = userDetails.getCompanyId();
            if (userCompanyId == null) {
                throw new SecurityException("User does not belong to any tenant company.");
            }
            if (queryCompanyId != null && !queryCompanyId.equals(userCompanyId)) {
                throw new SecurityException("Cross-tenant department creation is forbidden.");
            }
            if (request.getCompanyId() != null && !request.getCompanyId().equals(userCompanyId)) {
                throw new SecurityException("Payload company ID does not match caller tenant.");
            }
            company = companyRepository.findById(userCompanyId)
                    .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + userCompanyId));
        } else {
            Long effectiveCompanyId = resolveCompanyId(userDetails, queryCompanyId != null ? queryCompanyId : request.getCompanyId());
            if (effectiveCompanyId != null) {
                company = companyRepository.findById(effectiveCompanyId)
                        .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + effectiveCompanyId));
            } else {
                throw new IllegalArgumentException("Department must be associated with a valid company.");
            }
        }

        Department department = new Department();
        department.setName(request.getName());
        department.setCode(request.getCode());
        department.setDescription(request.getDescription());
        department.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        department.setCompany(company);

        Department saved = departmentRepository.save(department);
        return DepartmentResponse.from(saved);
    }

    @Transactional
    public DepartmentResponse updateDepartment(Integer id, DepartmentRequest request, CustomUserDetails userDetails) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", Long.valueOf(id)));

        if (userDetails != null && userDetails.getRole() != Role.SUPER_ADMIN) {
            Long userCompanyId = userDetails.getCompanyId();
            if (userCompanyId == null || dept.getCompany() == null || !dept.getCompany().getId().equals(userCompanyId)) {
                throw new TenantAccessDeniedException("Department", id);
            }
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            dept.setName(request.getName());
        }
        if (request.getCode() != null) {
            dept.setCode(request.getCode());
        }
        if (request.getDescription() != null) {
            dept.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            dept.setStatus(request.getStatus());
        }

        Department saved = departmentRepository.save(dept);
        return DepartmentResponse.from(saved);
    }

    @Transactional
    public void deleteDepartment(Integer id, CustomUserDetails userDetails) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department", Long.valueOf(id)));

        if (userDetails != null && userDetails.getRole() != Role.SUPER_ADMIN) {
            Long userCompanyId = userDetails.getCompanyId();
            if (userCompanyId == null || dept.getCompany() == null || !dept.getCompany().getId().equals(userCompanyId)) {
                throw new TenantAccessDeniedException("Department", id);
            }
        }

        departmentRepository.delete(dept);
    }

    private Long resolveCompanyId(CustomUserDetails userDetails, Long requestedCompanyId) {
        if (userDetails == null) return requestedCompanyId;
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            return requestedCompanyId;
        }
        Long tenantCompanyId = userDetails.getCompanyId();
        if (tenantCompanyId == null && userDetails.getUser() != null && userDetails.getUser().getCompany() != null) {
            tenantCompanyId = userDetails.getUser().getCompany().getId();
        }
        return tenantCompanyId;
    }
}
