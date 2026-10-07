package com.ticketpro.api.repository;

import com.ticketpro.api.entity.SlaPolicy;
import com.ticketpro.api.entity.Priority;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, Long> {
    List<SlaPolicy> findByCompanyId(Long companyId);
    org.springframework.data.domain.Page<SlaPolicy> findByCompanyId(Long companyId, org.springframework.data.domain.Pageable pageable);
    Optional<SlaPolicy> findByCompanyIdAndPriority(Long companyId, Priority priority);
}
