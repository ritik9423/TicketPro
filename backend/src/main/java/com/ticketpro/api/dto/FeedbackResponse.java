package com.ticketpro.api.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackResponse {
    private Long id;
    private Long ticketId;
    private String ticketNumber;
    private String ticketSubject;
    private Long companyId;
    private String companyName;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private Long agentId;
    private String agentName;
    private Integer rating;
    private String feedback;
    private String tags;
    private LocalDateTime createdAt;
}
