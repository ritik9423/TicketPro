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
@Schema(description = "Response payload after dispatching notification email and persisting in-app notification")
public class NotificationEmailResponse {

    @Schema(description = "Indicates whether the operation succeeded", example = "true")
    private boolean success;

    @Schema(description = "Indicates whether the email was successfully sent via SMTP", example = "true")
    private boolean emailDelivered;

    @Schema(description = "Recipient email address", example = "user@example.com")
    private String recipient;

    @Schema(description = "Tenant ID associated with the notification", example = "ACME")
    private String tenantId;

    @Schema(description = "Status of the dispatch", example = "DELIVERED_VIA_SMTP")
    private String status;

    @Schema(description = "ID of the saved in-app notification", example = "42")
    private Long notificationId;
}
