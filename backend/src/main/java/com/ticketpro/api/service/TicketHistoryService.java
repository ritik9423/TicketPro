package com.ticketpro.api.service;

import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.dto.TicketHistoryResponse;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.TicketHistory;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.TicketHistoryRepository;
import com.ticketpro.api.repository.TicketRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
public class TicketHistoryService {

    private final TicketHistoryRepository ticketHistoryRepository;
    private final TicketRepository ticketRepository;

    public TicketHistoryService(TicketHistoryRepository ticketHistoryRepository, TicketRepository ticketRepository) {
        this.ticketHistoryRepository = ticketHistoryRepository;
        this.ticketRepository = ticketRepository;
    }

    @Transactional
    public TicketHistory recordChange(Ticket ticket, String action, String fieldName, String oldValue, String newValue, User changedBy) {
        if (ticket == null || action == null) return null;
        try {
            TicketHistory history = new TicketHistory(ticket, action, fieldName, oldValue, newValue, changedBy);
            return ticketHistoryRepository.save(history);
        } catch (Exception e) {
            log.warn("Could not record ticket history for ticket {}: {}", ticket.getId(), e.getMessage());
            return null;
        }
    }

    @Transactional(readOnly = true)
    public List<TicketHistoryResponse> getHistoryByTicket(Long ticketId, Long callerCompanyId, Role callerRole, Long callerUserId) {
        validateAccess(ticketId, callerCompanyId, callerRole, callerUserId);
        return ticketHistoryRepository.findByTicketIdOrderByCreatedAtDesc(ticketId)
                .stream()
                .map(TicketHistoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<TicketHistoryResponse> getHistoryByTicketPaged(Long ticketId, Long callerCompanyId, Role callerRole, Long callerUserId, Pageable pageable) {
        validateAccess(ticketId, callerCompanyId, callerRole, callerUserId);
        Pageable safePageable = PageRequest.of(
                pageable.getPageNumber(),
                Math.min(pageable.getPageSize(), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<TicketHistory> page = ticketHistoryRepository.findByTicketIdOrderByCreatedAtDesc(ticketId, safePageable);
        return PagedResponse.from(page, TicketHistoryResponse::from);
    }

    private void validateAccess(Long ticketId, Long callerCompanyId, Role callerRole, Long callerUserId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + ticketId));

        if (callerRole != Role.SUPER_ADMIN) {
            if (callerCompanyId == null || ticket.getCompany() == null || !callerCompanyId.equals(ticket.getCompany().getId())) {
                throw new SecurityException("Unauthorized ticket history access: cross-tenant access denied.");
            }
            if (callerRole == Role.END_USER) {
                if (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(callerUserId)) {
                    throw new SecurityException("Unauthorized ticket history access: end-users can only view history of their own tickets.");
                }
            }
        }
    }
}
