package com.ticketpro.api.dto;

import com.ticketpro.api.entity.TicketHistory;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketHistoryResponse {
    private Long id;
    private String action;
    private String field;
    private String oldValue;
    private String newValue;
    private UserSummaryDto changedBy;
    private LocalDateTime timestamp;

    public static TicketHistoryResponse from(TicketHistory history) {
        if (history == null) return null;
        UserSummaryDto userSummary = null;
        if (history.getChangedBy() != null) {
            userSummary = new UserSummaryDto(history.getChangedBy().getId(), history.getChangedBy().getName());
        }
        return new TicketHistoryResponse(
                history.getId(),
                history.getAction(),
                history.getFieldName(),
                history.getOldValue(),
                history.getNewValue(),
                userSummary,
                history.getCreatedAt()
        );
    }
}
