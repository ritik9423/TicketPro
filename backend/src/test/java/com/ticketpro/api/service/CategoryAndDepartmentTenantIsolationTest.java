package com.ticketpro.api.service;

import com.ticketpro.api.controller.CategoryController;
import com.ticketpro.api.controller.DepartmentController;
import com.ticketpro.api.controller.PublicCategoryController;
import com.ticketpro.api.dto.CategoryResponse;
import com.ticketpro.api.dto.DepartmentResponse;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.CategoryRepository;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.DepartmentRepository;
import com.ticketpro.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryAndDepartmentTenantIsolationTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private CategoryService categoryService;

    private Company companyA;
    private Company companyB;
    private Company inactiveCompany;
    private User adminA;
    private User superAdmin;
    private CustomUserDetails adminADetails;
    private CustomUserDetails superAdminDetails;

    @BeforeEach
    void setUp() {
        companyA = new Company();
        companyA.setId(1L);
        companyA.setCompanyCode("ACME");
        companyA.setStatus(CompanyStatus.ACTIVE);

        companyB = new Company();
        companyB.setId(2L);
        companyB.setCompanyCode("BETA");
        companyB.setStatus(CompanyStatus.ACTIVE);

        inactiveCompany = new Company();
        inactiveCompany.setId(3L);
        inactiveCompany.setCompanyCode("INACTIVE");
        inactiveCompany.setStatus(CompanyStatus.SUSPENDED);

        adminA = new User();
        adminA.setId(10L);
        adminA.setRole(Role.COMPANY_ADMIN);
        adminA.setCompany(companyA);
        adminADetails = new CustomUserDetails(adminA);

        superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setRole(Role.SUPER_ADMIN);
        superAdminDetails = new CustomUserDetails(superAdmin);
    }

    @Test
    @DisplayName("CategoryService: Company Admin attempting to access or create for another company is blocked")
    void testResolveCompany_CrossTenantRejected() {
        assertThrows(SecurityException.class, () -> {
            categoryService.resolveCompany(companyB.getId(), null, adminADetails);
        });
    }

    @Test
    @DisplayName("CategoryService: Tenant company resolved strictly from authenticated user")
    void testResolveCompany_ResolvesFromPrincipal() {
        when(companyRepository.findById(companyA.getId())).thenReturn(Optional.of(companyA));

        Company resolved = categoryService.resolveCompany(null, null, adminADetails);

        assertNotNull(resolved);
        assertEquals(companyA.getId(), resolved.getId());
    }

    @Test
    @DisplayName("CategoryService: SUPER_ADMIN can resolve explicit company")
    void testResolveCompany_SuperAdminExplicitCompany() {
        when(companyRepository.findById(companyB.getId())).thenReturn(Optional.of(companyB));

        Company resolved = categoryService.resolveCompany(companyB.getId(), null, superAdminDetails);

        assertNotNull(resolved);
        assertEquals(companyB.getId(), resolved.getId());
    }

    @Test
    @DisplayName("CategoryService: No default fallback when unauthenticated companyCode is invalid")
    void testResolveCompany_NoDefaultFallback() {
        when(companyRepository.findByCompanyCode("NONEXISTENT")).thenReturn(Optional.empty());

        Company resolved = categoryService.resolveCompany(null, "NONEXISTENT", null);

        assertNull(resolved, "Must not silently fall back to any default company");
    }

    @Test
    @DisplayName("PublicCategoryController: Returns active categories for active companyCode")
    void testPublicCategories_ActiveCompany() {
        PublicCategoryController controller = new PublicCategoryController(companyRepository, categoryRepository);
        Category activeCat = new Category(companyA, "Hardware", "FIELDS:[]", CategoryStatus.ACTIVE);
        activeCat.setId(10L);

        when(companyRepository.findByCompanyCode("ACME")).thenReturn(Optional.of(companyA));
        when(categoryRepository.findByCompanyIdAndStatus(companyA.getId(), CategoryStatus.ACTIVE)).thenReturn(List.of(activeCat));

        ResponseEntity<List<CategoryResponse>> response = controller.getPublicCategories("ACME");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        List<CategoryResponse> body = java.util.Objects.requireNonNull(response.getBody());
        assertEquals(1, body.size());
        assertEquals("Hardware", body.get(0).getName());
    }

    @Test
    @DisplayName("PublicCategoryController: Rejects inactive/suspended company")
    void testPublicCategories_InactiveCompanyRejected() {
        PublicCategoryController controller = new PublicCategoryController(companyRepository, categoryRepository);
        when(companyRepository.findByCompanyCode("INACTIVE")).thenReturn(Optional.of(inactiveCompany));

        ResponseEntity<List<CategoryResponse>> response = controller.getPublicCategories("INACTIVE");

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("PublicCategoryController: Rejects nonexistent companyCode with 404")
    void testPublicCategories_NonexistentCompany() {
        PublicCategoryController controller = new PublicCategoryController(companyRepository, categoryRepository);
        when(companyRepository.findByCompanyCode("UNKNOWN")).thenReturn(Optional.empty());

        ResponseEntity<List<CategoryResponse>> response = controller.getPublicCategories("UNKNOWN");
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("DepartmentController: Company Admin cannot specify another company in department payload")
    void testDepartmentCreate_CrossTenantPayloadRejected() {
        DepartmentController controller = new DepartmentController(departmentRepository, companyRepository);

        Department dept = new Department();
        dept.setName("Security");
        dept.setCompany(companyB); // Attacker tries to set Tenant B

        assertThrows(SecurityException.class, () -> {
            controller.createDepartment(dept, null, adminADetails);
        });
    }

    @Test
    @DisplayName("DepartmentController: Company Admin creates department in own company")
    void testDepartmentCreate_EnforcesCallerTenant() {
        DepartmentController controller = new DepartmentController(departmentRepository, companyRepository);

        Department dept = new Department();
        dept.setName("IT Support");

        when(companyRepository.findById(companyA.getId())).thenReturn(Optional.of(companyA));
        when(departmentRepository.save(any(Department.class))).thenAnswer(inv -> {
            Department d = inv.getArgument(0);
            d.setId(100);
            return d;
        });

        ResponseEntity<DepartmentResponse> response = controller.createDepartment(dept, null, adminADetails);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        DepartmentResponse deptBody = java.util.Objects.requireNonNull(response.getBody());
        assertEquals(companyA.getId(), deptBody.getCompanyId());
    }

    @Test
    @DisplayName("DepartmentController: SUPER_ADMIN can create department for target company")
    void testDepartmentCreate_SuperAdminTargetCompany() {
        DepartmentController controller = new DepartmentController(departmentRepository, companyRepository);

        Department dept = new Department();
        dept.setName("Engineering B");

        when(companyRepository.findById(companyB.getId())).thenReturn(Optional.of(companyB));
        when(departmentRepository.save(any(Department.class))).thenAnswer(inv -> {
            Department d = inv.getArgument(0);
            d.setId(101);
            return d;
        });

        ResponseEntity<DepartmentResponse> response = controller.createDepartment(dept, companyB.getId(), superAdminDetails);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        DepartmentResponse deptBody2 = java.util.Objects.requireNonNull(response.getBody());
        assertEquals(companyB.getId(), deptBody2.getCompanyId());
    }

    @Test
    @DisplayName("Issue 2 - Test 1: Company A admin create category -> category.company = Company A")
    void testCategoryCreate_CompanyAdminEnforcesOwnTenant() {
        CategoryController controller = new CategoryController(categoryService);
        when(companyRepository.findById(companyA.getId())).thenReturn(Optional.of(companyA));
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> {
            Category c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });

        Category input = new Category();
        input.setName("Hardware Support");
        input.setDescription("Hardware issues");

        ResponseEntity<CategoryResponse> response = controller.createCategory(input, null, null, adminADetails);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        CategoryResponse catBody = java.util.Objects.requireNonNull(response.getBody());
        assertEquals(companyA.getId(), catBody.getCompanyId());
    }

    @Test
    @DisplayName("Issue 2 - Test 2: Company A admin attempt companyId = Company B -> rejected")
    void testCategoryCreate_CrossTenantRejected() {
        CategoryController controller = new CategoryController(categoryService);

        Category input = new Category();
        input.setName("Sneaky Category");

        assertThrows(SecurityException.class, () -> {
            controller.createCategory(input, companyB.getId(), null, adminADetails);
        });
    }

    @Test
    @DisplayName("Issue 2 - Test 3: SUPER_ADMIN create category for Company B -> allowed")
    void testCategoryCreate_SuperAdminExplicitCompanyAllowed() {
        CategoryController controller = new CategoryController(categoryService);
        when(companyRepository.findById(companyB.getId())).thenReturn(Optional.of(companyB));
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> {
            Category c = inv.getArgument(0);
            c.setId(200L);
            return c;
        });

        Category input = new Category();
        input.setName("Beta Operations");

        ResponseEntity<CategoryResponse> response = controller.createCategory(input, companyB.getId(), null, superAdminDetails);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        CategoryResponse catBody2 = java.util.Objects.requireNonNull(response.getBody());
        assertEquals(companyB.getId(), catBody2.getCompanyId());
    }

    @Test
    @DisplayName("Issue 2 - Test 4: Invalid company -> request rejected -> no fallback to Company ID 1")
    void testCategoryCreate_InvalidCompanyNoFallbackTo1L() {
        CategoryController controller = new CategoryController(categoryService);
        when(companyRepository.findByCompanyCode("NONEXISTENT")).thenReturn(Optional.empty());

        Category input = new Category();
        input.setName("Orphan Category");

        assertThrows(IllegalArgumentException.class, () -> {
            controller.createCategory(input, null, "NONEXISTENT", null);
        });
        verify(companyRepository, never()).findById(1L);
    }
}
