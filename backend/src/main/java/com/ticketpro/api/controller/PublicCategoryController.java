package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CategoryResponse;
import com.ticketpro.api.entity.CategoryStatus;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.CompanyStatus;
import com.ticketpro.api.repository.CategoryRepository;
import com.ticketpro.api.repository.CompanyRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/companies")
public class PublicCategoryController {

    private final CompanyRepository companyRepository;
    private final CategoryRepository categoryRepository;

    public PublicCategoryController(CompanyRepository companyRepository, CategoryRepository categoryRepository) {
        this.companyRepository = companyRepository;
        this.categoryRepository = categoryRepository;
    }

    /**
     * Dedicated public category endpoint for guest ticket creation forms.
     * Only returns ACTIVE categories for an ACTIVE company.
     */
    @GetMapping("/{companyCode}/categories")
    public ResponseEntity<List<CategoryResponse>> getPublicCategories(@PathVariable("companyCode") String companyCode) {
        if (companyCode == null || companyCode.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Company company = companyRepository.findByCompanyCode(companyCode.trim().toUpperCase())
                .orElse(null);

        if (company == null) {
            return ResponseEntity.notFound().build();
        }

        if (company.getStatus() != CompanyStatus.ACTIVE) {
            return ResponseEntity.status(403).build(); // Inactive / Suspended company
        }

        List<CategoryResponse> categories = categoryRepository
                .findByCompanyIdAndStatus(company.getId(), CategoryStatus.ACTIVE)
                .stream()
                .map(CategoryResponse::from)
                .toList();

        return ResponseEntity.ok(categories);
    }
}
