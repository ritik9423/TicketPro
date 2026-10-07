package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByCompanyCode(String companyCode);
    Optional<Company> findByCompanyCodeIgnoreCase(String companyCode);
    Optional<Company> findByCompanyNameIgnoreCase(String companyName);
}
