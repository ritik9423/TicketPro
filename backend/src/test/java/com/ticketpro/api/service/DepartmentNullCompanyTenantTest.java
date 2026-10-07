package com.ticketpro.api.service;

import com.ticketpro.api.controller.DepartmentController;
import com.ticketpro.api.dto.DepartmentResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Department;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.exception.TenantAccessDeniedException;
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

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepartmentNullCompanyTenantTest {

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private CompanyRepository companyRepository;

    @InjectMocks
    private DepartmentController departmentController;

    private Company companyA;
    private Company companyB;
    private User adminA;
    private CustomUserDetails adminADetails;
    private CustomUserDetails superAdminDetails;

    private Department deptCompanyA;
    private Department deptCompanyB;
    private Department deptNullCompany;

    @BeforeEach
    void setUp() {
        companyA = new Company();
        companyA.setId(1L);
        companyA.setCompanyName("Acme Corp");

        companyB = new Company();
        companyB.setId(2L);
        companyB.setCompanyName("Beta Corp");

        adminA = new User();
        adminA.setId(10L);
        adminA.setRole(Role.COMPANY_ADMIN);
        adminA.setCompany(companyA);
        adminADetails = new CustomUserDetails(adminA);

        User superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setRole(Role.SUPER_ADMIN);
        superAdminDetails = new CustomUserDetails(superAdmin);

        deptCompanyA = new Department();
        deptCompanyA.setId(100);
        deptCompanyA.setName("IT Support A");
        deptCompanyA.setCompany(companyA);

        deptCompanyB = new Department();
        deptCompanyB.setId(200);
        deptCompanyB.setName("IT Support B");
        deptCompanyB.setCompany(companyB);

        deptNullCompany = new Department();
        deptNullCompany.setId(300);
        deptNullCompany.setName("Orphan Dept");
        deptNullCompany.setCompany(null); // NULL company
    }

    @Test
    @DisplayName("Test 1: Company A user + Department belongs to Company A -> allowed")
    void test1_CompanyAUser_DeptCompanyA_Allowed() {
        when(departmentRepository.findById(100)).thenReturn(Optional.of(deptCompanyA));
        when(departmentRepository.save(any(Department.class))).thenAnswer(inv -> inv.getArgument(0));

        Department updateInfo = new Department();
        updateInfo.setName("IT Support A Renamed");

        ResponseEntity<DepartmentResponse> response = departmentController.updateDepartment(100, updateInfo, adminADetails);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        DepartmentResponse body = response.getBody();
        assertNotNull(body);
        assertEquals("IT Support A Renamed", body.getName());
    }

    @Test
    @DisplayName("Test 2: Company A user + Department belongs to Company B -> rejected with TenantAccessDeniedException")
    void test2_CompanyAUser_DeptCompanyB_Rejected() {
        when(departmentRepository.findById(200)).thenReturn(Optional.of(deptCompanyB));

        Department updateInfo = new Department();
        updateInfo.setName("Tampered Name");

        assertThrows(TenantAccessDeniedException.class, () -> {
            departmentController.updateDepartment(200, updateInfo, adminADetails);
        });
    }

    @Test
    @DisplayName("Test 3: Company A user + Department.company = null -> rejected with TenantAccessDeniedException")
    void test3_CompanyAUser_DeptNullCompany_Rejected() {
        when(departmentRepository.findById(300)).thenReturn(Optional.of(deptNullCompany));

        Department updateInfo = new Department();
        updateInfo.setName("Tampered Orphan Dept");

        assertThrows(TenantAccessDeniedException.class, () -> {
            departmentController.updateDepartment(300, updateInfo, adminADetails);
        });
    }

    @Test
    @DisplayName("Test 4: SUPER_ADMIN + Department.company = null -> allowed according to existing admin rules")
    void test4_SuperAdmin_DeptNullCompany_Allowed() {
        when(departmentRepository.findById(300)).thenReturn(Optional.of(deptNullCompany));
        when(departmentRepository.save(any(Department.class))).thenAnswer(inv -> inv.getArgument(0));

        Department updateInfo = new Department();
        updateInfo.setName("Super Admin Managed Dept");

        ResponseEntity<DepartmentResponse> response = departmentController.updateDepartment(300, updateInfo, superAdminDetails);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        DepartmentResponse body = response.getBody();
        assertNotNull(body);
        assertEquals("Super Admin Managed Dept", body.getName());
    }
}
