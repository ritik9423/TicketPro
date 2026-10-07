package com.ticketpro.api.repository;

import com.ticketpro.api.entity.TicketHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketHistoryRepository extends JpaRepository<TicketHistory, Long> {
    List<TicketHistory> findByTicketIdOrderByCreatedAtDesc(Long ticketId);
    Page<TicketHistory> findByTicketIdOrderByCreatedAtDesc(Long ticketId, Pageable pageable);
}
