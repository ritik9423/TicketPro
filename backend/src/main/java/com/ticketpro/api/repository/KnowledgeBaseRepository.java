package com.ticketpro.api.repository;

import com.ticketpro.api.entity.KnowledgeBase;
import com.ticketpro.api.entity.KbStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, Long> {
    List<KnowledgeBase> findByCompanyId(Long companyId);
    org.springframework.data.domain.Page<KnowledgeBase> findByCompanyId(Long companyId, org.springframework.data.domain.Pageable pageable);
    List<KnowledgeBase> findByCompanyIdAndStatus(Long companyId, KbStatus status);
    org.springframework.data.domain.Page<KnowledgeBase> findByCompanyIdAndStatus(Long companyId, KbStatus status, org.springframework.data.domain.Pageable pageable);
}
