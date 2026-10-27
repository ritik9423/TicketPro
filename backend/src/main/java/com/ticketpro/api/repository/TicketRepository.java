package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Priority;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {
    @Override
    @NonNull
    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    List<Ticket> findAll();

    @Override
    @NonNull
    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    Page<Ticket> findAll(@NonNull Pageable pageable);

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

    long countByCompanyIdAndPriority(Long companyId, Priority priority);
    long countByAssignedToId(Long agentId);
    long countByAssignedToIdAndStatus(Long agentId, TicketStatus status);
    long countByAssignedToIdAndPriority(Long agentId, Priority priority);
    long countByCreatedById(Long userId);
    long countByCreatedByIdAndStatus(Long userId, TicketStatus status);

    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    List<Ticket> findTop5ByCompanyIdOrderByCreatedAtDesc(Long companyId);

    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    List<Ticket> findTop5ByAssignedToIdOrderByCreatedAtDesc(Long agentId);

    @EntityGraph(attributePaths = {"category", "company", "createdBy", "assignedTo"})
    List<Ticket> findTop5ByCreatedByIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT t.company.id, COUNT(t.id) FROM Ticket t GROUP BY t.company.id")
    List<Object[]> countTicketsGroupedByCompany();

    @Query("SELECT t.status, COUNT(t.id) FROM Ticket t WHERE t.company.id = :companyId GROUP BY t.status")
    List<Object[]> countTicketsGroupedByStatusForCompany(@Param("companyId") Long companyId);

    @Query("SELECT t.priority, COUNT(t.id) FROM Ticket t WHERE t.company.id = :companyId GROUP BY t.priority")
    List<Object[]> countTicketsGroupedByPriorityForCompany(@Param("companyId") Long companyId);

    @Query("SELECT t.status, COUNT(t.id) FROM Ticket t WHERE t.assignedTo.id = :agentId GROUP BY t.status")
    List<Object[]> countTicketsGroupedByStatusForAgent(@Param("agentId") Long agentId);

    @Query("SELECT t.priority, COUNT(t.id) FROM Ticket t WHERE t.assignedTo.id = :agentId GROUP BY t.priority")
    List<Object[]> countTicketsGroupedByPriorityForAgent(@Param("agentId") Long agentId);

    @Query("SELECT t.status, COUNT(t.id) FROM Ticket t WHERE t.createdBy.id = :userId GROUP BY t.status")
    List<Object[]> countTicketsGroupedByStatusForCreator(@Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM tickets WHERE id = :id", nativeQuery = true)
    Optional<Ticket> findRawById(@org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE tickets SET deleted = false, deleted_at = NULL, deleted_by = NULL WHERE id = :id", nativeQuery = true)
    int restoreTicketById(@org.springframework.data.repository.query.Param("id") Long id);
}
