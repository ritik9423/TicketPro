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
@Schema(description = "Response payload after registering a user")
public class UserRegisterResponse {

    @Schema(description = "Informative status message", example = "User registered successfully! You can login immediately.")
    private String message;

    @Schema(description = "Account activation status", example = "ACTIVE")
    private String status;

    @Schema(description = "Assigned user ID", example = "10")
    private Long userId;

    @Schema(description = "Name of the registered user", example = "Jane Doe")
    private String name;
}
