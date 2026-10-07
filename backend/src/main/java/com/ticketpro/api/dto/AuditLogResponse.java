package com.ticketpro.api.dto;

import com.ticketpro.api.entity.AuditLog;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * AuditLog response DTO. Prevents direct JPA entity and User/Company internal structure exposure.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private Long companyId;
    private String companyName;
    private String action;
    private String entityType;
    private Long entityId;
    private String description;
    private String ipAddress;
    private LocalDateTime createdAt;

    public static AuditLogResponse from(AuditLog log) {
        if (log == null) return null;
        AuditLogResponse dto = new AuditLogResponse();
        dto.setId(log.getId());
        dto.setAction(log.getAction());
        dto.setEntityType(log.getEntityType());
        dto.setEntityId(log.getEntityId());
        dto.setDescription(log.getDescription());
        dto.setIpAddress(log.getIpAddress());
        dto.setCreatedAt(log.getCreatedAt());
        try {
            if (log.getUser() != null) {
                dto.setUserId(log.getUser().getId());
                dto.setUserName(log.getUser().getName());
                dto.setUserEmail(log.getUser().getEmail());
            }
        } catch (Exception ignored) {}
        try {
            if (log.getCompany() != null) {
                dto.setCompanyId(log.getCompany().getId());
                dto.setCompanyName(log.getCompany().getCompanyName());
            }
        } catch (Exception ignored) {}
        return dto;
    }

    public Map<String, Object> getUser() {
        if (userId == null && userName == null) return null;
        Map<String, Object> map = new HashMap<>();
        map.put("id", userId);
        map.put("name", userName);
        map.put("email", userEmail);
        return map;
    }

    public Map<String, Object> getCompany() {
        if (companyId == null && companyName == null) return null;
        Map<String, Object> map = new HashMap<>();
        map.put("id", companyId);
        map.put("name", companyName);
        return map;
    }
}
