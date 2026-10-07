package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Announcement;
import com.ticketpro.api.entity.AnnouncementStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for Announcement responses.
 * Encapsulates bulletin details without exposing internal JPA entity models,
 * Hibernate proxies, or sensitive creator details.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnouncementResponse {
    private Long id;
    private String title;
    private String message;
    private AnnouncementStatus status;
    private Long companyId;
    private String companyName;
    private String companyCode;
    private Long createdById;
    private String createdByName;
    private String createdByEmail;
    private LocalDateTime createdAt;

    public static AnnouncementResponse fromEntity(Announcement announcement) {
        if (announcement == null) return null;
        return AnnouncementResponse.builder()
                .id(announcement.getId())
                .title(announcement.getTitle())
                .message(announcement.getMessage())
                .status(announcement.getStatus())
                .companyId(announcement.getCompany() != null ? announcement.getCompany().getId() : null)
                .companyName(announcement.getCompany() != null ? announcement.getCompany().getCompanyName() : null)
                .companyCode(announcement.getCompany() != null ? announcement.getCompany().getCompanyCode() : null)
                .createdById(announcement.getCreatedBy() != null ? announcement.getCreatedBy().getId() : null)
                .createdByName(announcement.getCreatedBy() != null ? announcement.getCreatedBy().getName() : null)
                .createdByEmail(announcement.getCreatedBy() != null ? announcement.getCreatedBy().getEmail() : null)
                .createdAt(announcement.getCreatedAt())
                .build();
    }
}
