package com.ticketpro.api.service;

import com.ticketpro.api.controller.UserController;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.security.CustomUserDetails;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DefaultPaginationTest {

    @Mock
    private UserService userService;

    @Mock
    private CompanyService companyService;

    @InjectMocks
    private UserController userController;

    private Company companyA;
    private User superAdmin;
    private CustomUserDetails superAdminDetails;
    private User adminA;
    private CustomUserDetails adminADetails;

    @BeforeEach
    void setUp() {
        companyA = new Company();
        companyA.setId(1L);
        companyA.setCompanyName("Acme Corp");

        superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setRole(Role.SUPER_ADMIN);
        superAdminDetails = new CustomUserDetails(superAdmin);

        adminA = new User();
        adminA.setId(10L);
        adminA.setRole(Role.COMPANY_ADMIN);
        adminA.setCompany(companyA);
        adminADetails = new CustomUserDetails(adminA);
    }

    @Test
    @DisplayName("No page parameters -> default pagination applied (page = 0, size = 20)")
    void testNoPageParameters_AppliesDefaultPagination() {
        Page<User> mockPage = new PageImpl<>(List.of(adminA), PageRequest.of(0, 20), 1);
        when(userService.getAllUsersPaged(any(Pageable.class))).thenReturn(mockPage);

        ResponseEntity<?> response = userController.getUsers(null, null, superAdminDetails, PageRequest.of(0, 20));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() instanceof PagedResponse<?>);
        PagedResponse<?> pagedResponse = (PagedResponse<?>) response.getBody();
        assertNotNull(pagedResponse);
        assertEquals(0, pagedResponse.getPage());
        assertEquals(20, pagedResponse.getSize());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(userService).getAllUsersPaged(pageableCaptor.capture());
        Pageable actualPageable = pageableCaptor.getValue();
        assertEquals(0, actualPageable.getPageNumber());
        assertEquals(20, actualPageable.getPageSize());
    }

    @Test
    @DisplayName("Explicit page=1 & size=20 -> correct page requested")
    void testExplicitPageParameters() {
        Page<User> mockPage = new PageImpl<>(List.of(adminA), PageRequest.of(1, 20), 21);
        when(userService.getAllUsersPaged(any(Pageable.class))).thenReturn(mockPage);

        ResponseEntity<?> response = userController.getUsers(1, 20, superAdminDetails, PageRequest.of(0, 20));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(userService).getAllUsersPaged(pageableCaptor.capture());
        Pageable actualPageable = pageableCaptor.getValue();
        assertEquals(1, actualPageable.getPageNumber());
        assertEquals(20, actualPageable.getPageSize());
    }

    @Test
    @DisplayName("Excessive size parameter (size = 100000) -> capped at maximum page size of 100")
    void testExcessivePageSizeCappedAt100() {
        Page<User> mockPage = new PageImpl<>(List.of(adminA), PageRequest.of(0, 100), 1);
        when(userService.getAllUsersPaged(any(Pageable.class))).thenReturn(mockPage);

        ResponseEntity<?> response = userController.getUsers(0, 100000, superAdminDetails, PageRequest.of(0, 20));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(userService).getAllUsersPaged(pageableCaptor.capture());
        Pageable actualPageable = pageableCaptor.getValue();
        assertEquals(100, actualPageable.getPageSize());
    }

    @Test
    @DisplayName("Tenant filtering: Company A admin gets only Company A user data paginated")
    void testTenantFilteringBeforePagination() {
        Page<User> mockPage = new PageImpl<>(List.of(adminA), PageRequest.of(0, 20), 1);
        when(userService.getUsersByCompanyPaged(eq(1L), any(Pageable.class))).thenReturn(mockPage);

        ResponseEntity<?> response = userController.getUsers(null, null, adminADetails, PageRequest.of(0, 20));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(userService).getUsersByCompanyPaged(eq(1L), any(Pageable.class));
        verify(userService, never()).getAllUsersPaged(any());
    }
}
