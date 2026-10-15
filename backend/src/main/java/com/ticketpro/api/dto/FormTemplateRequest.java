package com.ticketpro.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class FormTemplateRequest {
    private Long companyId;
    private Long categoryId;

    @NotBlank(message = "Template name is required")
    private String name;

    private String description;
    private String status;
    private List<FormFieldDto> fields;

    public FormTemplateRequest() {
        this.fields = new ArrayList<>();
    }
}
