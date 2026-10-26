package com.ticketpro.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Standard OTP flow response payload")
public class OtpResponse {

    @Schema(description = "Indicates whether the operation was successful", example = "true")
    private boolean success;

    @Schema(description = "Descriptive response message", example = "A 6-digit verification code has been sent.")
    private String message;

    @Schema(description = "OTP validity duration in minutes", example = "5")
    private Integer expiresInMinutes;
}
