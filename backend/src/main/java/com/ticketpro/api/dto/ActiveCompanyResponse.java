package com.ticketpro.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Summary of active tenant company for public selection or branding")
public class ActiveCompanyResponse {

    @Schema(description = "Company ID", example = "1")
    private Long id;

    @Schema(description = "Company business name", example = "Acme Corp")
    private String name;

    @Schema(description = "Company workspace code", example = "ACME")
    private String code;

    @Schema(description = "JSON-encoded custom branding / metadata", example = "{\"logoUrl\":\"...\"}")
    private String customFields;

    @Schema(description = "Company logo URL", example = "https://cdn.example.com/logo.png")
    private String logoUrl;

    @Schema(description = "Primary UI accent color", example = "#4f46e5")
    private String primaryColor;
}
