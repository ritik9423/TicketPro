package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Priority;
import com.ticketpro.api.entity.SlaStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SlaRequest {
    private String name;
    private Priority priority;
    private int responseTimeMinutes;
    private int resolutionTimeMinutes;
    private SlaStatus status;
}
