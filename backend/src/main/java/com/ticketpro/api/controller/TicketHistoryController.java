package com.ticketpro.api.controller;

import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.dto.TicketHistoryResponse;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.TicketHistoryService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketHistoryController {

    private final TicketHistoryService ticketHistoryService;

    public TicketHistoryController(TicketHistoryService ticketHistoryService) {
        this.ticketHistoryService = ticketHistoryService;
    }

    @GetMapping("/{ticketId}/history")
    public ResponseEntity<?> getTicketHistory(
            @PathVariable("ticketId") Long ticketId,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Pageable pageable) {

        if (userDetails == null) {
            throw new SecurityException("Authentication is required to view ticket history.");
        }

        Long callerCompanyId = userDetails.getCompanyId();
        Role callerRole = userDetails.getRole();
        Long callerUserId = userDetails.getId();

        // If page param is provided, return paginated envelope
        if (page != null || size != null) {
            PagedResponse<TicketHistoryResponse> paged = ticketHistoryService.getHistoryByTicketPaged(
                    ticketId, callerCompanyId, callerRole, callerUserId, pageable);
            return ResponseEntity.ok(paged);
        }

        // Default: return full chronological list
        List<TicketHistoryResponse> history = ticketHistoryService.getHistoryByTicket(
                ticketId, callerCompanyId, callerRole, callerUserId);
        return ResponseEntity.ok(history);
    }
}
