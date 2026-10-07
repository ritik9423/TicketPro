package com.ticketpro.api.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InboundEmailRequest {
    private String from;
    private String fromName;
    private String to;
    private String subject;
    private String bodyPlain;
    private String bodyHtml;
    private String messageId;
    private String inReplyTo;
}

