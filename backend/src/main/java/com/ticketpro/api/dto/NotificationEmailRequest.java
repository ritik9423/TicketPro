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
@Schema(description = "Request payload for sending an email and storing an in-app notification")
public class NotificationEmailRequest {

    @NotBlank(message = "Recipient email address is required")
    @Email(message = "Recipient must be a valid email address")
    @Schema(description = "Recipient email address", example = "user@example.com")
    private String to;

    @Schema(description = "Subject of the notification email", example = "Ticket Update")
    private String subject;

    @Schema(description = "HTML body of the email", example = "<p>Your ticket has been updated.</p>")
    private String body;

    @Schema(description = "Plain text notification message for in-app storage", example = "Your ticket has been updated.")
    private String message;

    @Schema(description = "Target role for scoped in-app alerts", example = "ALL")
    private String targetRole;

    @Schema(description = "Target action link", example = "/tickets")
    private String link;

    @Schema(description = "Notification type classification", example = "TICKET_EVENT")
    private String type;

    @Schema(description = "Tenant ID override for Super Admins", example = "GLOBAL")
    private String tenantId;
}
