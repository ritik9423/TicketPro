package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Category;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Category response DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CategoryResponse {
    private Long id;
    private String name;
    private String description;
    private String status;
    private Long companyId;
    private String companyName;

    public static CategoryResponse from(Category category) {
        if (category == null) return null;
        CategoryResponse dto = new CategoryResponse();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        dto.setStatus(category.getStatus() != null ? category.getStatus().name() : null);
        try {
            if (category.getCompany() != null) {
                dto.setCompanyId(category.getCompany().getId());
                dto.setCompanyName(category.getCompany().getCompanyName());
            }
        } catch (Exception ignored) {}
        return dto;
    }
}
