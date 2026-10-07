package com.ticketpro.api.service;

import com.ticketpro.api.controller.PublicTicketController;
import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.CompanyStatus;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
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
class SafeIpRateLimitingTest {

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

    @BeforeEach
    void setUp() {
        activeCompany = new Company();
        activeCompany.setId(1L);
        activeCompany.setCompanyCode("ACME");
        activeCompany.setStatus(CompanyStatus.ACTIVE);
    }

    @Test
    @DisplayName("Test 1 — Normal Request: remoteAddr = 10.0.0.1 -> uses remoteAddr for rate limiter key")
    void test1_NormalRequestUsesRemoteAddr() {
        when(servletRequest.getRemoteAddr()).thenReturn("10.0.0.1");
        when(rateLimiterService.tryAcquire("10.0.0.1")).thenReturn(true);
        when(companyRepository.findByCompanyCodeIgnoreCase("ACME")).thenReturn(Optional.of(activeCompany));

        User supportUser = new User();
        supportUser.setId(5L);
        supportUser.setCompany(activeCompany);
        when(userRepository.findFirstByCompanyIdOrderByIdAsc(1L)).thenReturn(Optional.of(supportUser));

        Ticket ticket = new Ticket();
        ticket.setId(100L);
        ticket.setTicketNumber("#ACME-100");
        when(ticketService.createTicket(any(), any(), any())).thenReturn(ticket);

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("ACME");
        request.setSubject("Test Issue");

        publicTicketController.createPublicTicket(request, servletRequest);

        verify(rateLimiterService).tryAcquire("10.0.0.1");
    }

    @Test
    @DisplayName("Test 2 — Untrusted Client Header: X-Forwarded-For fake-ip sent -> not blindly trusted")
    void test2_UntrustedClientHeaderIgnored() {
        when(servletRequest.getRemoteAddr()).thenReturn("10.0.0.1"); // Connection IP
        when(rateLimiterService.tryAcquire("10.0.0.1")).thenReturn(true);
        when(companyRepository.findByCompanyCodeIgnoreCase("ACME")).thenReturn(Optional.of(activeCompany));

        User supportUser = new User();
        supportUser.setId(5L);
        supportUser.setCompany(activeCompany);
        when(userRepository.findFirstByCompanyIdOrderByIdAsc(1L)).thenReturn(Optional.of(supportUser));

        Ticket ticket = new Ticket();
        ticket.setId(101L);
        ticket.setTicketNumber("#ACME-101");
        when(ticketService.createTicket(any(), any(), any())).thenReturn(ticket);

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("ACME");

        publicTicketController.createPublicTicket(request, servletRequest);

        // Rate limiter key MUST use 10.0.0.1 and NEVER fake spoofed header
        verify(rateLimiterService).tryAcquire("10.0.0.1");
        verify(rateLimiterService, never()).tryAcquire("2.2.2.2");
    }

    @Test
    @DisplayName("Test 3 & 4 — Rate limiting behavior remains functional with safe IP keying")
    void test3And4_RateLimitingFunctional() {
        when(servletRequest.getRemoteAddr()).thenReturn("10.0.0.1");
        when(rateLimiterService.tryAcquire("10.0.0.1")).thenReturn(false);
        when(rateLimiterService.getWindowSeconds()).thenReturn(60L);

        TicketRequest request = new TicketRequest();
        request.setCompanyCode("ACME");

        ResponseEntity<?> response = publicTicketController.createPublicTicket(request, servletRequest);

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("60", response.getHeaders().getFirst("Retry-After"));
        verify(ticketService, never()).createTicket(any(), any(), any());
    }
}
