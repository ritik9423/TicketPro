package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {
    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    List<Ticket> findByCompanyId(Long companyId);

    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    Page<Ticket> findByCompanyId(Long companyId, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    List<Ticket> findByCreatedById(Long userId);

    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    Page<Ticket> findByCreatedById(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    List<Ticket> findByAssignedToId(Long agentId);

    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    Page<Ticket> findByAssignedToId(Long agentId, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    Optional<Ticket> findByTicketNumber(String ticketNumber);

    boolean existsByTicketNumber(String ticketNumber);
    boolean existsByFormTemplateId(Long formTemplateId);

    List<Ticket> findByStatusInAndSlaBreachedFalseAndSlaResolutionDeadlineBefore(List<TicketStatus> statuses, LocalDateTime deadline);

    long countByCompanyIdAndStatus(Long companyId, TicketStatus status);
    long countByCompanyId(Long companyId);
    long countByStatus(TicketStatus status);

    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM tickets WHERE id = :id", nativeQuery = true)
    Optional<Ticket> findRawById(@org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE tickets SET deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = :id", nativeQuery = true)
    int restoreTicketById(@org.springframework.data.repository.query.Param("id") Long id);
}
