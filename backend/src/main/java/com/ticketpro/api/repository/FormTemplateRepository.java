package com.ticketpro.api.repository;

import com.ticketpro.api.entity.FormTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FormTemplateRepository extends JpaRepository<FormTemplate, Long> {
    List<FormTemplate> findByCompanyId(Long companyId);
    Page<FormTemplate> findByCompanyId(Long companyId, Pageable pageable);
    Optional<FormTemplate> findByCompanyIdAndCategoryId(Long companyId, Long categoryId);
    Optional<FormTemplate> findByCategoryId(Long categoryId);
    Optional<FormTemplate> findFirstByCompanyIdAndCategoryIdAndStatusOrderByVersionDesc(Long companyId, Long categoryId, String status);
    Optional<FormTemplate> findFirstByCategoryIdAndStatusOrderByVersionDesc(Long categoryId, String status);
    Optional<FormTemplate> findFirstByCompanyIdAndCategoryIdOrderByVersionDesc(Long companyId, Long categoryId);
    Optional<FormTemplate> findFirstByCategoryIdOrderByVersionDesc(Long categoryId);
}
