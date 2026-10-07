package com.ticketpro.api.dto;

import com.ticketpro.api.entity.FormTemplate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FormTemplateResponse {
    private Long id;
    private Long companyId;
    private Long categoryId;
    private String categoryName;
    private String name;
    private String description;
    private Integer version;
    private String status;
    private List<FormFieldDto> fields = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FormTemplateResponse from(FormTemplate template) {
        if (template == null) return null;
        List<FormFieldDto> fieldDtos = template.getFields() != null
                ? template.getFields().stream().map(FormFieldDto::from).toList()
                : List.of();
        Long catId = template.getCategory() != null ? template.getCategory().getId() : null;
        String catName = template.getCategory() != null ? template.getCategory().getName() : null;
        Long compId = template.getCompany() != null ? template.getCompany().getId() : null;

        return new FormTemplateResponse(
                template.getId(),
                compId,
                catId,
                catName,
                template.getName(),
                template.getDescription(),
                template.getVersion(),
                template.getStatus(),
                fieldDtos,
                template.getCreatedAt(),
                template.getUpdatedAt()
        );
    }
}
