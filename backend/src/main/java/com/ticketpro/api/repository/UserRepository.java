package com.ticketpro.api.repository;

import com.ticketpro.api.entity.User;
import com.ticketpro.api.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @EntityGraph(attributePaths = {"company"})
    Optional<User> findByEmail(String email);

    @Override
    @NonNull
    @EntityGraph(attributePaths = {"company"})
    Page<User> findAll(@NonNull Pageable pageable);

    @Override
    @NonNull
    @EntityGraph(attributePaths = {"company"})
    List<User> findAll();

    List<User> findByCompanyId(Long companyId);
    Page<User> findByCompanyId(Long companyId, Pageable pageable);
    List<User> findByCompanyIdAndRole(Long companyId, Role role);
    Optional<User> findFirstByCompanyIdOrderByIdAsc(Long companyId);

    @Query("""
        SELECT u FROM User u
        LEFT JOIN Ticket t ON t.assignedTo = u 
             AND t.status IN (com.ticketpro.api.entity.TicketStatus.OPEN, com.ticketpro.api.entity.TicketStatus.IN_PROGRESS)
        WHERE u.company.id = :companyId
          AND u.role = com.ticketpro.api.entity.Role.AGENT
          AND u.status = com.ticketpro.api.entity.UserStatus.ACTIVE
          AND (
            LOWER(u.department) = LOWER(:department)
            OR LOWER(u.department) LIKE LOWER(CONCAT('%', :department, '%'))
            OR LOWER(:department) LIKE LOWER(CONCAT('%', u.department, '%'))
            OR (LOWER(u.department) LIKE '%it%' AND LOWER(:department) LIKE '%it%')
            OR (LOWER(u.department) LIKE '%fleet%' AND LOWER(:department) LIKE '%fleet%')
            OR (LOWER(u.department) LIKE '%iot%' AND LOWER(:department) LIKE '%iot%')
            OR (LOWER(u.department) LIKE '%supply%' AND LOWER(:department) LIKE '%supply%')
          )
        GROUP BY u.id
        ORDER BY COUNT(t.id) ASC, u.id ASC
    """)
    List<User> findLeastLoadedAgentsByDepartment(@Param("companyId") Long companyId, @Param("department") String department);

    @Query("""
        SELECT u FROM User u
        LEFT JOIN Ticket t ON t.assignedTo = u 
             AND t.status IN (com.ticketpro.api.entity.TicketStatus.OPEN, com.ticketpro.api.entity.TicketStatus.IN_PROGRESS)
        WHERE u.company.id = :companyId
          AND u.role = com.ticketpro.api.entity.Role.AGENT
          AND u.status = com.ticketpro.api.entity.UserStatus.ACTIVE
        GROUP BY u.id
        ORDER BY COUNT(t.id) ASC, u.id ASC
    """)
    List<User> findLeastLoadedGeneralAgents(@Param("companyId") Long companyId);
}
