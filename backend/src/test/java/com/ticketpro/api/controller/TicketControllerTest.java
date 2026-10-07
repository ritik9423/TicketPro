package com.ticketpro.api.controller;

import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.TicketService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketControllerTest {

    @Mock
    private TicketService ticketService;

    @Mock
    private CompanyRepository companyRepository;

    private TicketController ticketController;
    private Company company;

    @BeforeEach
    void setUp() {
        ticketController = new TicketController(ticketService, companyRepository);

        company = new Company();
        company.setId(1L);
        company.setCompanyCode("ACME");
    }

    @Test
    void updateTicketRejectsAnonymousUser() {
        ResponseEntity<com.ticketpro.api.dto.TicketResponse> response = ticketController.updateTicket(10L, new TicketRequest(), null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(ticketService, never()).updateTicket(
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void getTicketByIdRejectsEndUserReadingAnotherUsersTicket() {
        User owner = user(11L, Role.END_USER);
        User requester = user(12L, Role.END_USER);
        Ticket ticket = ticket(owner, null);

        when(ticketService.getTicketById(20L)).thenReturn(ticket);

        ResponseEntity<com.ticketpro.api.dto.TicketResponse> response = ticketController.getTicketById(20L, new CustomUserDetails(requester));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void getTicketByIdAllowsAssignedAgent() {
        User owner = user(11L, Role.END_USER);
        User agent = user(21L, Role.AGENT);
        Ticket ticket = ticket(owner, agent);

        when(ticketService.getTicketById(30L)).thenReturn(ticket);

        ResponseEntity<com.ticketpro.api.dto.TicketResponse> response = ticketController.getTicketById(30L, new CustomUserDetails(agent));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        com.ticketpro.api.dto.TicketResponse body = response.getBody();
        org.junit.jupiter.api.Assertions.assertNotNull(body);
        if (body != null) {
            assertEquals(ticket.getId(), body.getId());
        }
    }

    private User user(Long id, Role role) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setCompany(company);
        return user;
    }

    private Ticket ticket(User owner, User assignedTo) {
        Ticket ticket = new Ticket();
        ticket.setId(100L);
        ticket.setCompany(company);
        ticket.setCreatedBy(owner);
        ticket.setAssignedTo(assignedTo);
        return ticket;
    }
}
