package com.ticketpro.api.dto;

import com.ticketpro.api.entity.FormField;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FormFieldDto {
    private Long id;
    private String fieldType; // TEXT, TEXTAREA, NUMBER, EMAIL, DATE, DROPDOWN, RADIO, CHECKBOX, FILE
    private String label;
    private String fieldKey;
    private String placeholder;
    private Boolean required;
    private Integer displayOrder;
    private String validationConfig;
    private String fieldConfig;
    private List<FormFieldOptionDto> options = new ArrayList<>();

    public static FormFieldDto from(FormField field) {
        if (field == null) return null;
        List<FormFieldOptionDto> optionDtos = field.getOptions() != null
                ? field.getOptions().stream().map(FormFieldOptionDto::from).toList()
                : List.of();
        return new FormFieldDto(
                field.getId(),
                field.getFieldType(),
                field.getLabel(),
                field.getFieldKey(),
                field.getPlaceholder(),
                field.getRequired(),
                field.getDisplayOrder(),
                field.getValidationConfig(),
                field.getFieldConfig(),
                optionDtos
        );
    }
}
