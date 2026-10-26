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
@Schema(description = "Unread notification count response")
public class UnreadCountResponse {

    @Schema(description = "User's authenticated email", example = "user@example.com")
    private String email;

    @Schema(description = "Count of unread notifications", example = "5")
    private long unreadCount;
}
