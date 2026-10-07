package com.ticketpro.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ticketpro.api.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Notification response DTO. Prevents direct entity exposure.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String recipientEmail;
    private String title;
    private String message;
    private String type;
    private String tenantId;
    private String targetRole;
    private String link;
    private boolean read;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification n) {
        if (n == null) return null;
        NotificationResponse dto = new NotificationResponse();
        dto.setId(n.getId());
        dto.setRecipientEmail(n.getRecipientEmail());
        dto.setTitle(com.ticketpro.api.service.NotificationService.cleanHtmlText(n.getTitle()));
        dto.setMessage(com.ticketpro.api.service.NotificationService.cleanHtmlText(n.getMessage()));
        dto.setType(n.getType());
        dto.setTenantId(n.getTenantId());
        dto.setTargetRole(n.getTargetRole());
        dto.setLink(n.getLink());
        dto.setRead(n.isRead());
        dto.setCreatedAt(n.getCreatedAt());
        return dto;
    }

    @JsonProperty("isRead")
    public boolean getIsRead() {
        return read;
    }
}
