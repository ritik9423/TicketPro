package com.ticketpro.api.dto;

import com.ticketpro.api.entity.SlaPolicy;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * SLA Policy response DTO. Prevents direct entity exposure.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SlaPolicyResponse {
    private Long id;
    private Long companyId;
    private String companyName;
    private String name;
    private String priority;
    private int responseTimeMinutes;
    private int resolutionTimeMinutes;
    private String status;
    private LocalDateTime createdAt;

    public static SlaPolicyResponse from(SlaPolicy policy) {
        if (policy == null) return null;
        SlaPolicyResponse dto = new SlaPolicyResponse();
        dto.setId(policy.getId());
        dto.setName(policy.getName());
        dto.setPriority(policy.getPriority() != null ? policy.getPriority().name() : null);
        dto.setResponseTimeMinutes(policy.getResponseTimeMinutes());
        dto.setResolutionTimeMinutes(policy.getResolutionTimeMinutes());
        dto.setStatus(policy.getStatus() != null ? policy.getStatus().name() : null);
        dto.setCreatedAt(policy.getCreatedAt());
        try {
            if (policy.getCompany() != null) {
                dto.setCompanyId(policy.getCompany().getId());
                dto.setCompanyName(policy.getCompany().getCompanyName());
            }
        } catch (Exception ignored) {}
        return dto;
    }
}
