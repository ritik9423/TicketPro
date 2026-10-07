package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Priority;
import com.ticketpro.api.entity.SlaStatus;
import lombok.NoArgsConstructor;

@NoArgsConstructor
public class CreateSlaPolicyRequest extends SlaRequest {
    public CreateSlaPolicyRequest(String name, Priority priority, int responseTimeMinutes, int resolutionTimeMinutes, SlaStatus status) {
        super(name, priority, responseTimeMinutes, resolutionTimeMinutes, status);
    }
}
