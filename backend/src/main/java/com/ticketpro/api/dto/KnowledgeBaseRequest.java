package com.ticketpro.api.dto;

import com.ticketpro.api.entity.KbStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseRequest {
    private String title;
    private String content;
    private Long categoryId;
    private KbStatus status;
}
