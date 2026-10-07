package com.ticketpro.api.service;

import com.ticketpro.api.entity.Category;
import com.ticketpro.api.entity.CategoryStatus;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.repository.CategoryRepository;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.security.CustomUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CompanyRepository companyRepository;

    public CategoryService(CategoryRepository categoryRepository, CompanyRepository companyRepository) {
        this.categoryRepository = categoryRepository;
        this.companyRepository = companyRepository;
    }

    public Company resolveCompany(Long companyId, String companyCode, CustomUserDetails userDetails) {
        // 1. Authenticated Non-SUPER_ADMIN users are strictly bound to their own company
        if (userDetails != null && userDetails.getRole() != com.ticketpro.api.entity.Role.SUPER_ADMIN) {
            Long userCompanyId = userDetails.getCompanyId();
            if (userCompanyId == null) {
                throw new SecurityException("User does not belong to any tenant company.");
            }
            if (companyId != null && !companyId.equals(userCompanyId)) {
                throw new SecurityException("Cross-tenant category access is forbidden: caller tenant does not match requested company.");
            }
            if (companyCode != null && !companyCode.trim().isEmpty() && userDetails.getCompanyCode() != null) {
                if (!companyCode.trim().equalsIgnoreCase(userDetails.getCompanyCode().trim())) {
                    throw new SecurityException("Cross-tenant category access is forbidden: caller tenant code does not match.");
                }
            }
            return companyRepository.findById(userCompanyId)
                    .orElseThrow(() -> new IllegalArgumentException("Tenant company not found with id: " + userCompanyId));
        }

        // 2. SUPER_ADMIN can explicitly select by companyId or companyCode
        if (userDetails != null && userDetails.getRole() == com.ticketpro.api.entity.Role.SUPER_ADMIN) {
            if (companyId != null) {
                return companyRepository.findById(companyId).orElse(null);
            }
            if (companyCode != null && !companyCode.trim().isEmpty()) {
                return companyRepository.findByCompanyCode(companyCode.trim().toUpperCase()).orElse(null);
            }
            if (userDetails.getCompanyId() != null) {
                return companyRepository.findById(userDetails.getCompanyId()).orElse(null);
            }
            return null; // Never silently assign to a random company
        }

        // 3. Public access (unauthenticated) with explicit companyCode
        if (companyCode != null && !companyCode.trim().isEmpty()) {
            Optional<Company> byCode = companyRepository.findByCompanyCode(companyCode.trim().toUpperCase());
            if (byCode.isPresent() && byCode.get().getStatus() == com.ticketpro.api.entity.CompanyStatus.ACTIVE) {
                return byCode.get();
            }
        }
        return null;
    }

    @Transactional
    public List<Category> getCategoriesByCompany(Long companyId) {
        if (companyId == null) return List.of();
        List<Category> categories = categoryRepository.findByCompanyId(companyId);
        if (categories.isEmpty()) {
            Company company = companyRepository.findById(companyId).orElse(null);
            if (company != null) {
                return seedDefaultCategoriesForCompany(company);
            }
        }
        return categories;
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Category> getCategoriesByCompanyPaged(Long companyId, org.springframework.data.domain.Pageable pageable) {
        if (companyId == null) return org.springframework.data.domain.Page.empty();
        return categoryRepository.findByCompanyId(companyId, pageable);
    }

    @Transactional
    public List<Category> getActiveCategoriesByCompany(Long companyId) {
        if (companyId == null) return List.of();
        List<Category> categories = categoryRepository.findByCompanyIdAndStatus(companyId, CategoryStatus.ACTIVE);
        if (categories.isEmpty()) {
            Company company = companyRepository.findById(companyId).orElse(null);
            if (company != null) {
                seedDefaultCategoriesForCompany(company);
                return categoryRepository.findByCompanyIdAndStatus(companyId, CategoryStatus.ACTIVE);
            }
        }
        return categories;
    }

    private List<Category> seedDefaultCategoriesForCompany(Company company) {
        List<Category> seeded = new ArrayList<>();
        String[] defaultNames = {"Technical Support", "Billing & Invoices", "User Access & Roles", "General Operations"};
        String defaultFields = "FIELDS:[{\"id\":1,\"type\":\"text\",\"label\":\"Subject\",\"placeholder\":\"Enter request subject...\",\"required\":true},{\"id\":2,\"type\":\"textarea\",\"label\":\"Description\",\"placeholder\":\"Enter detailed description...\",\"required\":true}]";

        for (String name : defaultNames) {
            Category c = new Category();
            c.setName(name);
            c.setDescription(defaultFields);
            c.setStatus(CategoryStatus.ACTIVE);
            c.setCompany(company);
            seeded.add(categoryRepository.save(c));
        }
        return seeded;
    }

    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id).orElse(null);
    }

    @Transactional
    public Category createCategory(Category category) {
        return createCategory(category, category.getCompany());
    }

    @Transactional
    public Category createCategory(Category category, Company company) {
        if (company != null) {
            category.setCompany(company);
        } else if (category.getCompany() == null) {
            throw new IllegalArgumentException("Category must be associated with a valid company.");
        }
        if (category.getStatus() == null) {
            category.setStatus(CategoryStatus.ACTIVE);
        }

        // If a category with same name exists for this company, update it instead of creating duplicates
        if (category.getCompany() != null && category.getName() != null) {
            Optional<Category> existing = categoryRepository.findByCompanyIdAndNameIgnoreCase(
                    category.getCompany().getId(), category.getName().trim());
            if (existing.isPresent()) {
                Category toUpdate = existing.get();
                if (category.getDescription() != null) {
                    toUpdate.setDescription(category.getDescription());
                }
                toUpdate.setStatus(CategoryStatus.ACTIVE);
                return categoryRepository.save(toUpdate);
            }
        }
        return categoryRepository.save(category);
    }

    public void assignCompanyToCategory(Category category, Long companyId) {
        if (companyId == null) {
            throw new IllegalArgumentException("Company ID cannot be null.");
        }
        Company comp = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + companyId));
        category.setCompany(comp);
    }

    @Transactional
    public Category updateCategory(Long id, Category categoryDetails, Long companyId, boolean isSuperAdmin) {
        Company targetComp = null;
        if (companyId != null) {
            targetComp = companyRepository.findById(companyId).orElse(null);
        }
        return updateCategory(id, categoryDetails, targetComp, isSuperAdmin);
    }

    @Transactional
    public Category updateCategory(Long id, Category categoryDetails, Company targetCompany, boolean isSuperAdmin) {
        Category category = null;
        if (id != null && id < 1000000000L) {
            category = categoryRepository.findById(id).orElse(null);
        }

        // If category not found by id, try finding by name within company
        if (category == null && targetCompany != null && categoryDetails.getName() != null) {
            category = categoryRepository.findByCompanyIdAndNameIgnoreCase(
                    targetCompany.getId(), categoryDetails.getName().trim()).orElse(null);
        }

        // If still not found, create as new category
        if (category == null) {
            if (targetCompany == null) {
                throw new IllegalArgumentException("Target company must not be null when creating category.");
            }
            categoryDetails.setId(null);
            categoryDetails.setCompany(targetCompany);
            if (categoryDetails.getStatus() == null) {
                categoryDetails.setStatus(CategoryStatus.ACTIVE);
            }
            return categoryRepository.save(categoryDetails);
        }

        // Security check: non-super-admins cannot update categories of another tenant
        if (!isSuperAdmin) {
            if (targetCompany == null || category.getCompany() == null || !category.getCompany().getId().equals(targetCompany.getId())) {
                throw new SecurityException("Cross-tenant category update is forbidden.");
            }
        }

        // Update company association if needed for super admin
        if (targetCompany != null && (category.getCompany() == null || !category.getCompany().getId().equals(targetCompany.getId()))) {
            category.setCompany(targetCompany);
        }

        if (categoryDetails.getName() != null && !categoryDetails.getName().isBlank()) {
            category.setName(categoryDetails.getName().trim());
        }
        if (categoryDetails.getDescription() != null) {
            category.setDescription(categoryDetails.getDescription());
        }
        if (categoryDetails.getStatus() != null) {
            category.setStatus(categoryDetails.getStatus());
        }
        return categoryRepository.save(category);
    }

    @Transactional
    public List<Category> syncCategoriesForCompany(Company company, List<Category> incomingList) {
        if (company == null) return List.of();
        List<Category> result = new ArrayList<>();

        for (Category incoming : incomingList) {
            if (incoming.getName() == null || incoming.getName().isBlank()) continue;
            Category toSave = null;
            Long incId = incoming.getId();

            if (incId != null && incId < 1000000000L) {
                toSave = categoryRepository.findById(incId).orElse(null);
            }
            if (toSave == null) {
                toSave = categoryRepository.findByCompanyIdAndNameIgnoreCase(company.getId(), incoming.getName().trim()).orElse(null);
            }

            if (toSave == null) {
                toSave = new Category();
                toSave.setCompany(company);
                toSave.setName(incoming.getName().trim());
            } else if (toSave.getCompany() == null || !toSave.getCompany().getId().equals(company.getId())) {
                toSave.setCompany(company);
            }

            toSave.setDescription(incoming.getDescription());
            toSave.setStatus(incoming.getStatus() != null ? incoming.getStatus() : CategoryStatus.ACTIVE);
            result.add(categoryRepository.save(toSave));
        }

        return result;
    }

    @Transactional
    public void deleteCategory(Long id, Long companyId, boolean isSuperAdmin) {
        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null) return;
        if (!isSuperAdmin) {
            if (companyId == null || category.getCompany() == null || !companyId.equals(category.getCompany().getId())) {
                throw new SecurityException("Cross-tenant category deletion is forbidden.");
            }
        }
        try {
            categoryRepository.delete(category);
        } catch (Exception e) {
            category.setStatus(CategoryStatus.INACTIVE);
            categoryRepository.save(category);
        }
    }
}
