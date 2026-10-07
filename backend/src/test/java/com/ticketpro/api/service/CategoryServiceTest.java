package com.ticketpro.api.service;

import com.ticketpro.api.entity.Category;
import com.ticketpro.api.entity.CategoryStatus;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.repository.CategoryRepository;
import com.ticketpro.api.repository.CompanyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private CompanyRepository companyRepository;

    @InjectMocks
    private CategoryService categoryService;

    private Company testCompany;

    @BeforeEach
    void setUp() {
        testCompany = new Company();
        testCompany.setId(1L);
        testCompany.setCompanyName("Acme Corp");
        testCompany.setCompanyCode("ACME");
    }

    @Test
    void testGetCategoriesByCompany() {
        Category cat1 = new Category();
        cat1.setId(10L);
        cat1.setName("Billing Support");
        cat1.setCompany(testCompany);
        cat1.setStatus(CategoryStatus.ACTIVE);

        when(categoryRepository.findByCompanyId(1L)).thenReturn(List.of(cat1));

        List<Category> result = categoryService.getCategoriesByCompany(1L);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Billing Support", result.get(0).getName());
        verify(categoryRepository, times(1)).findByCompanyId(1L);
    }

    @Test
    void testCreateCategory() {
        Category newCat = new Category();
        newCat.setName("IT Hardware");
        newCat.setDescription("FIELDS:[{\"label\":\"Serial\",\"type\":\"text\",\"required\":true}]");
        newCat.setCompany(testCompany);

        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Category created = categoryService.createCategory(newCat);

        assertNotNull(created);
        assertEquals("IT Hardware", created.getName());
        assertTrue(created.getDescription().startsWith("FIELDS:"));
        verify(categoryRepository, times(1)).save(newCat);
    }

    @Test
    void testUpdateCategory() {
        Category existing = new Category();
        existing.setId(20L);
        existing.setName("Old Name");
        existing.setCompany(testCompany);

        Category updateDetails = new Category();
        updateDetails.setName("New Form Category");
        updateDetails.setDescription("FIELDS:[{\"label\":\"Priority Level\",\"type\":\"select\"}]");

        when(categoryRepository.findById(20L)).thenReturn(Optional.of(existing));
        when(companyRepository.findById(1L)).thenReturn(Optional.of(testCompany));
        when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Category updated = categoryService.updateCategory(20L, updateDetails, 1L, false);

        assertNotNull(updated);
        assertEquals("New Form Category", updated.getName());
        assertEquals("FIELDS:[{\"label\":\"Priority Level\",\"type\":\"select\"}]", updated.getDescription());
        verify(categoryRepository, times(1)).save(existing);
    }
}
