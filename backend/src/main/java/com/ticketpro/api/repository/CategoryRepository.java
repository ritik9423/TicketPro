package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Category;
import com.ticketpro.api.entity.CategoryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByCompanyId(Long companyId);
    Page<Category> findByCompanyId(Long companyId, Pageable pageable);
    List<Category> findByCompanyIdAndStatus(Long companyId, CategoryStatus status);
    Page<Category> findByCompanyIdAndStatus(Long companyId, CategoryStatus status, Pageable pageable);
    Optional<Category> findByCompanyIdAndNameIgnoreCase(Long companyId, String name);
}
