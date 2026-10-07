package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CategoryResponse;
import com.ticketpro.api.entity.Category;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Category Controller — returns CategoryResponse DTOs.
 * All exceptions flow to GlobalExceptionHandler (no inline try-catch).
 */
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping("/company/{companyId}")
    public ResponseEntity<List<CategoryResponse>> getCategoriesByCompanyId(
            @PathVariable("companyId") Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null && userDetails.getRole() != Role.SUPER_ADMIN) {
            if (!companyId.equals(userDetails.getCompanyId())) {
                throw new SecurityException("Cross-tenant category access is forbidden.");
            }
        }
        return ResponseEntity.ok(categoryService.getCategoriesByCompany(companyId).stream().map(CategoryResponse::from).toList());
    }

    @GetMapping
    public ResponseEntity<?> getCategories(
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @RequestParam(name = "page", required = false) Integer page,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            org.springframework.data.domain.Pageable pageable) {
        Company targetCompany = categoryService.resolveCompany(companyId, companyCode, userDetails);
        if (targetCompany == null) {
            return ResponseEntity.ok(List.of());
        }
        if (page != null) {
            org.springframework.data.domain.Page<Category> categoryPage = categoryService.getCategoriesByCompanyPaged(targetCompany.getId(), pageable);
            return ResponseEntity.ok(com.ticketpro.api.dto.PagedResponse.from(categoryPage, CategoryResponse::from));
        }
        return ResponseEntity.ok(categoryService.getCategoriesByCompany(targetCompany.getId()).stream().map(CategoryResponse::from).toList());
    }

    @GetMapping("/active")
    public ResponseEntity<List<CategoryResponse>> getActiveCategories(
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Company targetCompany = categoryService.resolveCompany(companyId, companyCode, userDetails);
        if (targetCompany == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(categoryService.getActiveCategoriesByCompany(targetCompany.getId()).stream().map(CategoryResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<CategoryResponse> createCategory(
            @RequestBody Category category,
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Company targetCompany = categoryService.resolveCompany(companyId, companyCode, userDetails);
        if (targetCompany == null) {
            throw new IllegalArgumentException("Target company could not be resolved.");
        }
        Category created = categoryService.createCategory(category, targetCompany);
        return ResponseEntity.status(HttpStatus.CREATED).body(CategoryResponse.from(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable("id") Long id,
            @RequestBody Category categoryDetails,
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        boolean isSuperAdmin = (userDetails != null && userDetails.getRole() == Role.SUPER_ADMIN);
        Company targetCompany = categoryService.resolveCompany(companyId, companyCode, userDetails);
        if (targetCompany == null && !isSuperAdmin) {
            throw new SecurityException("Target company could not be resolved.");
        }
        Category updated = categoryService.updateCategory(id, categoryDetails, targetCompany, isSuperAdmin);
        return ResponseEntity.ok(CategoryResponse.from(updated));
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<List<CategoryResponse>> syncCompanyCategories(
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @RequestBody List<Category> categories,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Company targetCompany = categoryService.resolveCompany(companyId, companyCode, userDetails);
        if (targetCompany == null) {
            throw new IllegalArgumentException("Target company could not be resolved.");
        }
        List<Category> saved = categoryService.syncCategoriesForCompany(targetCompany, categories);
        return ResponseEntity.ok(saved.stream().map(CategoryResponse::from).toList());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable("id") Long id,
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        boolean isSuperAdmin = (userDetails != null && userDetails.getRole() == Role.SUPER_ADMIN);
        Company targetCompany = categoryService.resolveCompany(companyId, companyCode, userDetails);
        if (targetCompany == null && !isSuperAdmin) {
            throw new SecurityException("Target company could not be resolved.");
        }
        Long targetCompanyId = targetCompany != null ? targetCompany.getId() : null;
        categoryService.deleteCategory(id, targetCompanyId, isSuperAdmin);
        return ResponseEntity.noContent().build();
    }
}
