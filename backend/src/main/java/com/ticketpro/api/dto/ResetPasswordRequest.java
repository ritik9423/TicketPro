package com.ticketpro.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload to verify OTP and reset account password")
public class ResetPasswordRequest {

    @NotBlank(message = "Email address is required")
    @Email(message = "Must be a valid email address")
    @Schema(description = "Account email address", example = "user@example.com")
    private String email;

    @NotBlank(message = "OTP verification code is required")
    @Schema(description = "6-digit OTP code", example = "123456")
    private String otp;

    @NotBlank(message = "New password is required")
    @Schema(description = "New password (at least 8 chars with letters & numbers)", example = "NewStrongPass123!")
    private String newPassword;
}
