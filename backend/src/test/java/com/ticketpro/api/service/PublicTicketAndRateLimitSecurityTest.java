package com.ticketpro.api.service;

import com.ticketpro.api.controller.PublicTicketController;
import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.dto.TicketResponse;
import com.ticketpro.api.entity.Category;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.CompanyStatus;
import com.ticketpro.api.entity.Department;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.exception.ResourceNotFoundException;
import com.ticketpro.api.repository.CategoryRepository;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.DepartmentRepository;
import com.ticketpro.api.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicTicketAndRateLimitSecurityTest {

    @Mock
    private TicketService ticketService;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RateLimiterService rateLimiterService;

    @Mock
    private HttpServletRequest servletRequest;

    @InjectMocks
    private PublicTicketController publicTicketController;

    private Company activeCompany;
    private Company suspendedCompany;
    private Company otherCompany;

    @BeforeEach
    void setUp() {
        activeCompany = new Company();
        activeCompany.setId(1L);
        activeCompany.setCompanyCode("ACME");
        activeCompany.setStatus(CompanyStatus.ACTIVE);

        suspendedCompany = new Company();
        suspendedCompany.setId(2L);
        suspendedCompany.setCompanyCode("SUSPENDED");
        suspendedCompany.setStatus(CompanyStatus.SUSPENDED);

        otherCompany = new Company();
        otherCompany.setId(3L);
        otherCompany.setCompanyCode("OTHER");
        otherCompany.setStatus(CompanyStatus.ACTIVE);
    }

    @Test
    @DisplayName("Public ticket rejected with 429 when rate limit is exceeded")
    void testRateLimitExceeded() {
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.50");
        when(rateLimiterService.tryAcquire("192.168.1.50")).thenReturn(false);
        when(rateLimiterService.getWindowSeconds()).thenReturn(60L);

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("ACME");

        ResponseEntity<TicketResponse> response = publicTicketController.createPublicTicket(request, servletRequest);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("60", response.getHeaders().getFirst("Retry-After"));
        verify(ticketService, never()).createTicket(any(), any(), any());
    }

    @Test
    @DisplayName("Public ticket requires companyCode")
    void testMissingCompanyCodeRejected() {
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.50");
        when(rateLimiterService.tryAcquire("192.168.1.50")).thenReturn(true);

        TicketRequest request = new TicketRequest();
        request.setCompanyCode(null);

        assertThrows(IllegalArgumentException.class, () -> {
            publicTicketController.createPublicTicket(request, servletRequest);
        });
    }

    @Test
    @DisplayName("Public ticket with unknown companyCode throws 404 ResourceNotFoundException")
    void testUnknownCompanyCodeRejected() {
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.50");
        when(rateLimiterService.tryAcquire("192.168.1.50")).thenReturn(true);
        when(companyRepository.findByCompanyCodeIgnoreCase("NONEXISTENT")).thenReturn(Optional.empty());

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("NONEXISTENT");

        assertThrows(ResourceNotFoundException.class, () -> {
            publicTicketController.createPublicTicket(request, servletRequest);
        });
    }

    @Test
    @DisplayName("Public ticket on suspended company returns 403 Forbidden")
    void testSuspendedCompanyRejected() {
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.50");
        when(rateLimiterService.tryAcquire("192.168.1.50")).thenReturn(true);
        when(companyRepository.findByCompanyCodeIgnoreCase("SUSPENDED")).thenReturn(Optional.of(suspendedCompany));

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("SUSPENDED");

        ResponseEntity<TicketResponse> response = publicTicketController.createPublicTicket(request, servletRequest);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("Issue 1 - Test 1: Company A has support user -> Company A user selected")
    void testValidPublicTicketSuccess() {
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.50");
        when(rateLimiterService.tryAcquire("192.168.1.50")).thenReturn(true);
        when(companyRepository.findByCompanyCodeIgnoreCase("ACME")).thenReturn(Optional.of(activeCompany));

        User mockUser = new User();
        mockUser.setId(10L);
        mockUser.setCompany(activeCompany);
        mockUser.setEmail("support@acme.com");
        when(userRepository.findFirstByCompanyIdOrderByIdAsc(activeCompany.getId())).thenReturn(Optional.of(mockUser));

        Ticket ticket = new Ticket();
        ticket.setId(500L);
        ticket.setTicketNumber("#ACME-500");
        ticket.setCompany(activeCompany);
        ticket.setSubject("Public Issue");
        ticket.setDescription("Issue Details");

        when(ticketService.createTicket(any(), eq(activeCompany), eq(mockUser))).thenReturn(ticket);

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("ACME");
        request.setSubject("Public Issue");
        request.setDescription("Issue Details");
        request.setCreatorEmail("customer@external.com");

        ResponseEntity<TicketResponse> response = publicTicketController.createPublicTicket(request, servletRequest);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        TicketResponse body = java.util.Objects.requireNonNull(response.getBody());
        assertEquals("#ACME-500", body.getTicketNumber());
        verify(userRepository, times(1)).findFirstByCompanyIdOrderByIdAsc(activeCompany.getId());
    }

    @Test
    @DisplayName("Issue 1 - Test 2: Company A has no support user -> Request fails safely, Company B user NEVER selected")
    void testCompanyAHasNoSupportUserFailsSafely() {
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.50");
        when(rateLimiterService.tryAcquire("192.168.1.50")).thenReturn(true);
        when(companyRepository.findByCompanyCodeIgnoreCase("ACME")).thenReturn(Optional.of(activeCompany));

        // Company A has no user
        when(userRepository.findFirstByCompanyIdOrderByIdAsc(activeCompany.getId())).thenReturn(Optional.empty());

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("ACME");
        request.setSubject("Public Issue");

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            publicTicketController.createPublicTicket(request, servletRequest);
        });

        assertTrue(ex.getMessage().contains("No support user is configured for this company"));
        verify(ticketService, never()).createTicket(any(), any(), any());
    }

    @Test
    @DisplayName("Issue 1 - Test 3: Company A ticket, Category belongs to Company B -> request rejected")
    void testCategoryCrossTenantRejected() {
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.50");
        when(rateLimiterService.tryAcquire("192.168.1.50")).thenReturn(true);
        when(companyRepository.findByCompanyCodeIgnoreCase("ACME")).thenReturn(Optional.of(activeCompany));

        Category foreignCat = new Category(otherCompany, "Foreign", "Desc", com.ticketpro.api.entity.CategoryStatus.ACTIVE);
        when(categoryRepository.findById(99L)).thenReturn(Optional.of(foreignCat));

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("ACME");
        request.setCategoryId(99L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            publicTicketController.createPublicTicket(request, servletRequest);
        });
        assertTrue(ex.getMessage().contains("Category does not belong to the requested company"));
    }

    @Test
    @DisplayName("Issue 1 - Test 4: Company A ticket, Department belongs to Company B -> request rejected")
    void testDepartmentCrossTenantRejected() {
        when(servletRequest.getRemoteAddr()).thenReturn("192.168.1.50");
        when(rateLimiterService.tryAcquire("192.168.1.50")).thenReturn(true);
        when(companyRepository.findByCompanyCodeIgnoreCase("ACME")).thenReturn(Optional.of(activeCompany));

        Department foreignDept = new Department();
        foreignDept.setId(88);
        foreignDept.setName("Foreign Dept");
        foreignDept.setCompany(otherCompany); // Company B
        when(departmentRepository.findById(88)).thenReturn(Optional.of(foreignDept));

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("ACME");
        request.setDepartmentId(88);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            publicTicketController.createPublicTicket(request, servletRequest);
        });
        assertTrue(ex.getMessage().contains("Department does not belong to the requested company"));
    }

    @Test
    @DisplayName("RateLimiterService: Sliding window rate limiting correctly tracks IP addresses")
    void testRateLimiterServiceDirectly() {
        RateLimiterService limiter = new InMemoryRateLimiterService(10, 60);
        // Default is 10 requests per 60 seconds
        String testIp = "10.0.0.1";
        for (int i = 0; i < 10; i++) {
            assertTrue(limiter.tryAcquire(testIp), "Request " + (i + 1) + " should be allowed");
        }
        // 11th request should be blocked
        assertFalse(limiter.tryAcquire(testIp), "11th request should exceed limit and be rejected");

        // A different IP should be isolated and allowed
        String differentIp = "10.0.0.2";
        assertTrue(limiter.tryAcquire(differentIp), "Different IP should have independent limit");
    }
}
