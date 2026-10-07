package com.ticketpro.api.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InboundEmailResponse {
    private boolean success;
    private String action; // TICKET_CREATED, COMMENT_ADDED, REJECTED
    private Long ticketId;
    private String ticketNumber;
    private String message;
}

