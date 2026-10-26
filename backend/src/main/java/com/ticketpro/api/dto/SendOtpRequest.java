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
@Schema(description = "Request payload to send a password reset OTP")
public class SendOtpRequest {

    @NotBlank(message = "Email address is required")
    @Email(message = "Must be a valid email address")
    @Schema(description = "Registered account email address", example = "user@example.com")
    private String email;
}
