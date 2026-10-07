package com.ticketpro.api.repository;

import com.ticketpro.api.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
    org.springframework.data.domain.Page<AuditLog> findByCompanyIdOrderByCreatedAtDesc(Long companyId, org.springframework.data.domain.Pageable pageable);
    List<AuditLog> findAllByOrderByCreatedAtDesc();
    org.springframework.data.domain.Page<AuditLog> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);
}
