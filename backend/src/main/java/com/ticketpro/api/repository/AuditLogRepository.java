package com.ticketpro.api.repository;

import com.ticketpro.api.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    @EntityGraph(attributePaths = {"user", "company"})
    List<AuditLog> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    @EntityGraph(attributePaths = {"user", "company"})
    Page<AuditLog> findByCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "company"})
    List<AuditLog> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"user", "company"})
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"user", "company"})
    List<AuditLog> findTop10ByOrderByCreatedAtDesc();
}
