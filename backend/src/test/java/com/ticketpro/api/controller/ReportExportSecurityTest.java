package com.ticketpro.api.controller;

import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.ReportExportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportExportSecurityTest {

    @Mock
    private ReportExportService reportExportService;

    @InjectMocks
    private ReportExportController reportExportController;

    private Company companyA;
    private User endUser;
    private User adminUser;
    private User superAdmin;

    @BeforeEach
    void setUp() {
        companyA = new Company();
        companyA.setId(1L);
        companyA.setCompanyCode("ACME");

        endUser = new User();
        endUser.setId(10L);
        endUser.setRole(Role.END_USER);
        endUser.setCompany(companyA);

        adminUser = new User();
        adminUser.setId(40L);
        adminUser.setRole(Role.COMPANY_ADMIN);
        adminUser.setCompany(companyA);

        superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setRole(Role.SUPER_ADMIN);
    }

    @Test
    @DisplayName("Reports: END_USER access throws SecurityException")
    void testEndUserReportAccessThrows() throws Exception {
        CustomUserDetails userDetails = new CustomUserDetails(endUser);

        assertThrows(SecurityException.class, () -> {
            reportExportController.exportTicketsExcel(null, null, null, userDetails);
        });

        verify(reportExportService, never()).generateTicketsExcelReport(any(), any(), any());
    }

    @Test
    @DisplayName("Reports: Cross-tenant companyId throws SecurityException for COMPANY_ADMIN")
    void testCrossTenantReportAccessDenied() throws Exception {
        CustomUserDetails userDetails = new CustomUserDetails(adminUser);

        assertThrows(SecurityException.class, () -> {
            reportExportController.exportTicketsExcel(999L, null, null, userDetails);
        });

        verify(reportExportService, never()).generateTicketsExcelReport(any(), any(), any());
    }

    @Test
    @DisplayName("Reports: COMPANY_ADMIN is strictly scoped to own company")
    void testCompanyAdminReportScopedToOwnCompany() throws Exception {
        CustomUserDetails userDetails = new CustomUserDetails(adminUser);
        when(reportExportService.generateTicketsExcelReport(eq(companyA.getId()), any(), any()))
                .thenReturn(new byte[]{1, 2, 3});

        ResponseEntity<byte[]> response = reportExportController.exportTicketsExcel(null, null, null, userDetails);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(reportExportService).generateTicketsExcelReport(eq(companyA.getId()), any(), any());
    }

    @Test
    @DisplayName("Reports: SUPER_ADMIN can export global or target company")
    void testSuperAdminReportAllowed() throws Exception {
        CustomUserDetails userDetails = new CustomUserDetails(superAdmin);
        when(reportExportService.generateTicketsExcelReport(isNull(), any(), any()))
                .thenReturn(new byte[]{1, 2, 3});

        ResponseEntity<byte[]> response = reportExportController.exportTicketsExcel(null, null, null, userDetails);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(reportExportService).generateTicketsExcelReport(isNull(), any(), any());
    }
}
