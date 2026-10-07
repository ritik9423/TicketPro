package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Department;
import com.ticketpro.api.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {
    List<Department> findByCompany(Company company);
    List<Department> findByCompanyId(Long companyId);
    Page<Department> findByCompanyId(Long companyId, Pageable pageable);
    java.util.Optional<Department> findByNameIgnoreCase(String name);
    java.util.Optional<Department> findByCompanyIdAndNameIgnoreCase(Long companyId, String name);
}
