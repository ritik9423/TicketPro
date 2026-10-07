package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Department;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Department response DTO with tenant context.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponse {
    private Integer id;
    private String name;
    private String code;
    private String description;
    private String status;
    private Long companyId;
    private String companyName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DepartmentResponse from(Department department) {
        if (department == null) return null;
        DepartmentResponse dto = new DepartmentResponse();
        dto.setId(department.getId());
        dto.setName(department.getName());
        dto.setCode(department.getCode());
        dto.setDescription(department.getDescription());
        dto.setStatus(department.getStatus());
        dto.setCreatedAt(department.getCreatedAt());
        dto.setUpdatedAt(department.getUpdatedAt());
        try {
            if (department.getCompany() != null) {
                dto.setCompanyId(department.getCompany().getId());
                dto.setCompanyName(department.getCompany().getCompanyName());
            }
        } catch (Exception ignored) {}
        return dto;
    }
}
