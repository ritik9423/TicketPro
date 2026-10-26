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
@Schema(description = "Response returned after OTP validation")
public class VerifyOtpResponse {

    @Schema(description = "Indicates whether validation succeeded", example = "true")
    private boolean success;

    @Schema(description = "Verification boolean flag", example = "true")
    private boolean verified;

    @Schema(description = "Single-use cryptographic reset token for resetting password", example = "d94b0c6f-a8cb-4e96-a83d-e6b72a6b2db1")
    private String resetToken;

    @Schema(description = "Result message", example = "OTP verified successfully. Please set your new password.")
    private String message;
}
