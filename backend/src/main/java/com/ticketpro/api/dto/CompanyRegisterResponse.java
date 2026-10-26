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
@Schema(description = "Response returned after registering a new tenant company")
public class CompanyRegisterResponse {

    @Schema(description = "Status message", example = "Company and admin user registered successfully")
    private String message;

    @Schema(description = "ID of the registered company", example = "1")
    private Long companyId;

    @Schema(description = "Unique company workspace code", example = "ACME")
    private String companyCode;
}
