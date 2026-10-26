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
@Schema(description = "Request payload to register a new user or support agent")
public class UserRegisterRequest {

    @NotBlank(message = "Name is required")
    @Schema(description = "Full name of the user", example = "Jane Doe")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    @Schema(description = "Email address for login", example = "jane@example.com")
    private String email;

    @NotBlank(message = "Password is required")
    @Schema(description = "Password (must be at least 8 characters with letters and numbers)", example = "Password123!")
    private String password;

    @Schema(description = "Contact phone number", example = "+1234567890")
    private String phone;

    @Schema(description = "Company code of the organization", example = "ACME")
    private String companyCode;

    @Schema(description = "Requested role (e.g. END_USER, AGENT)", example = "END_USER")
    private String role;
}
