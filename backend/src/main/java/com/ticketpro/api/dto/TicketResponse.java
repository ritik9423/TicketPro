package com.ticketpro.api.dto;

import com.ticketpro.api.entity.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Clean, flat ticket response DTO.
 * Prevents JPA entity exposure and N+1 lazy loading in JSON serialization.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {
    private Long id;
    private String ticketNumber;
    private String subject;
    private String description;
    private String priority;
    private String status;
    private String department;

    // Company (flattened)
    private Long companyId;
    private String companyName;
    private String companyCode;

    // Creator (flattened)
    private Long createdById;
    private String createdByName;
    private String createdByEmail;

    // Assignee (flattened)
    private Long assignedToId;
    private String assignedToName;
    private String assignedToEmail;

    // Category (flattened)
    private Long categoryId;
    private String categoryName;

    // SLA
    private Boolean slaBreached;
    private LocalDateTime slaResponseDeadline;
    private LocalDateTime slaResolutionDeadline;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime firstResponseAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;

    // CSAT
    private Integer satisfactionRating;
    private String satisfactionFeedback;
    private String satisfactionTags;
    private LocalDateTime satisfactionRatedAt;

    // Attachments
    private List<AttachmentResponse> attachments;

    // Dynamic Form Values
    private Long formTemplateId;
    private Integer formVersion;
    private Map<String, Object> formValues;

    public static TicketResponse from(Ticket ticket) {
        return from(ticket, null);
    }

    public static TicketResponse from(Ticket ticket, List<FormSubmissionValue> submissionValues) {
        if (ticket == null) return null;
        TicketResponse dto = new TicketResponse();
        try {
            if (ticket.getFormTemplate() != null) {
                dto.setFormTemplateId(ticket.getFormTemplate().getId());
                dto.setFormVersion(ticket.getFormTemplate().getVersion());
            } else if (submissionValues != null && !submissionValues.isEmpty()) {
                for (FormSubmissionValue sv : submissionValues) {
                    if (sv.getField() != null && sv.getField().getFormTemplate() != null) {
                        dto.setFormTemplateId(sv.getField().getFormTemplate().getId());
                        dto.setFormVersion(sv.getField().getFormTemplate().getVersion());
                        break;
                    }
                }
            }
        } catch (Exception ignored) {}

        if (submissionValues != null && !submissionValues.isEmpty()) {
            Map<String, Object> map = new HashMap<>();
            for (FormSubmissionValue sv : submissionValues) {
                if (sv.getField() != null) {
                    String key = sv.getField().getFieldKey() != null ? sv.getField().getFieldKey() : sv.getField().getLabel();
                    map.put(key, sv.getValue());
                }
            }
            dto.setFormValues(map);
        } else {
            dto.setFormValues(new HashMap<>());
        }
        dto.setId(ticket.getId());
        dto.setTicketNumber(ticket.getTicketNumber());
        dto.setSubject(ticket.getSubject());
        dto.setDescription(ticket.getDescription());
        dto.setPriority(ticket.getPriority() != null ? ticket.getPriority().name() : null);
        dto.setStatus(ticket.getStatus() != null ? ticket.getStatus().name() : null);
        dto.setDepartment(ticket.getDepartment());
        dto.setSlaBreached(ticket.getSlaBreached());
        dto.setSlaResponseDeadline(ticket.getSlaResponseDeadline());
        dto.setSlaResolutionDeadline(ticket.getSlaResolutionDeadline());
        dto.setCreatedAt(ticket.getCreatedAt());
        dto.setUpdatedAt(ticket.getUpdatedAt());
        dto.setFirstResponseAt(ticket.getFirstResponseAt());
        dto.setResolvedAt(ticket.getResolvedAt());
        dto.setClosedAt(ticket.getClosedAt());
        dto.setSatisfactionRating(ticket.getSatisfactionRating());
        dto.setSatisfactionFeedback(ticket.getSatisfactionFeedback());
        dto.setSatisfactionTags(ticket.getSatisfactionTags());
        dto.setSatisfactionRatedAt(ticket.getSatisfactionRatedAt());

        try {
            if (ticket.getCompany() != null) {
                dto.setCompanyId(ticket.getCompany().getId());
                dto.setCompanyName(ticket.getCompany().getCompanyName());
                dto.setCompanyCode(ticket.getCompany().getCompanyCode());
            }
        } catch (Exception ignored) {}

        try {
            if (ticket.getCreatedBy() != null) {
                dto.setCreatedById(ticket.getCreatedBy().getId());
                dto.setCreatedByName(ticket.getCreatedBy().getName());
                dto.setCreatedByEmail(ticket.getCreatedBy().getEmail());
            }
        } catch (Exception ignored) {}

        try {
            if (ticket.getAssignedTo() != null) {
                dto.setAssignedToId(ticket.getAssignedTo().getId());
                dto.setAssignedToName(ticket.getAssignedTo().getName());
                dto.setAssignedToEmail(ticket.getAssignedTo().getEmail());
            }
        } catch (Exception ignored) {}

        try {
            if (ticket.getCategory() != null) {
                dto.setCategoryId(ticket.getCategory().getId());
                dto.setCategoryName(ticket.getCategory().getName());
            }
        } catch (Exception ignored) {}

        try {
            if (ticket.getAttachments() != null && !ticket.getAttachments().isEmpty()) {
                List<AttachmentResponse> attachmentDtos = new ArrayList<>();
                for (Attachment att : ticket.getAttachments()) {
                    attachmentDtos.add(AttachmentResponse.from(att));
                }
                dto.setAttachments(attachmentDtos);
            }
        } catch (Exception ignored) {
            dto.setAttachments(new ArrayList<>());
        }

        return dto;
    }

    public String getCreatorName() {
        return createdByName;
    }

    public String getUserEmail() {
        return createdByEmail;
    }

    public Map<String, Object> getCategory() {
        if (categoryId == null && (categoryName == null || categoryName.isBlank())) {
            return null;
        }
        Map<String, Object> map = new HashMap<>();
        map.put("id", categoryId);
        map.put("name", categoryName);
        return map;
    }

    public Map<String, Object> getAssignedTo() {
        if (assignedToId == null && (assignedToName == null || assignedToName.isBlank())) {
            return null;
        }
        Map<String, Object> map = new HashMap<>();
        map.put("id", assignedToId);
        map.put("name", assignedToName);
        map.put("email", assignedToEmail);
        return map;
    }

    public Map<String, Object> getCreatedBy() {
        if (createdById == null && (createdByName == null || createdByName.isBlank())) {
            return null;
        }
        Map<String, Object> map = new HashMap<>();
        map.put("id", createdById);
        map.put("name", createdByName);
        map.put("email", createdByEmail);
        return map;
    }

    public Map<String, Object> getCompany() {
        if (companyId == null && (companyName == null || companyName.isBlank())) {
            return null;
        }
        Map<String, Object> map = new HashMap<>();
        map.put("id", companyId);
        map.put("companyName", companyName);
        map.put("companyCode", companyCode);
        return map;
    }
}
