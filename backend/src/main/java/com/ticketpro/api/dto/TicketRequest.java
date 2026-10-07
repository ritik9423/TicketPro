package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Priority;
import com.ticketpro.api.entity.TicketStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketRequest {
    private String subject;
    private String description;
    private Priority priority;
    private Long categoryId;
    private Long assignedToId;
    private String department;
    private Integer departmentId;
    private TicketStatus status;

    // Direct multi-tenant context fields to guarantee robust persistence
    private String companyCode;
    private String creatorEmail;
    private Long createdById;

    // Dynamic form builder values
    private java.util.Map<String, Object> formValues;
    private java.util.Map<String, Object> customFields;
}
