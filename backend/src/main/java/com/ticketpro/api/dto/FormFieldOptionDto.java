package com.ticketpro.api.dto;

import com.ticketpro.api.entity.FormFieldOption;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FormFieldOptionDto {
    private Long id;
    private String label;
    private String value;
    private Integer displayOrder;

    public static FormFieldOptionDto from(FormFieldOption option) {
        if (option == null) return null;
        return new FormFieldOptionDto(
                option.getId(),
                option.getLabel(),
                option.getValue(),
                option.getDisplayOrder()
        );
    }
}
