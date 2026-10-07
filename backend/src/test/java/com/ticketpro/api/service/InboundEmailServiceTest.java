package com.ticketpro.api.service;

import com.ticketpro.api.dto.CommentRequest;
import com.ticketpro.api.dto.InboundEmailRequest;
import com.ticketpro.api.dto.InboundEmailResponse;
import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InboundEmailServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private TicketService ticketService;

    @Mock
    private CommentService commentService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private InboundEmailService inboundEmailService;

    private Company company;
    private User customer;
    private Ticket ticket;

    @BeforeEach
    void setUp() {
        company = new Company();
        company.setId(1L);
        company.setCompanyName("IOCL");
        company.setCompanyCode("IOCL");

        customer = new User();
        customer.setId(20L);
        customer.setName("Ritik Kumar");
        customer.setEmail("ritik@iocl.com");
        customer.setRole(Role.END_USER);
        customer.setCompany(company);

        ticket = new Ticket();
        ticket.setId(50L);
        ticket.setTicketNumber("#IOCL-1001");
        ticket.setSubject("Database Connection Issue");
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCompany(company);
        ticket.setCreatedBy(customer);
    }

    @Test
    void testInboundReplyAppendsComment() {
        InboundEmailRequest request = new InboundEmailRequest();
        request.setFrom("Ritik Kumar <ritik@iocl.com>");
        request.setSubject("Re: [IOCL] Support Ticket #IOCL-1001");
        request.setBodyPlain("I restarted the service and now it connects.");

        when(ticketRepository.findByTicketNumber("#IOCL-1001")).thenReturn(Optional.of(ticket));
        when(userRepository.findByEmail("ritik@iocl.com")).thenReturn(Optional.of(customer));
        when(commentService.addComment(eq(50L), any(CommentRequest.class), eq(1L), eq(Role.END_USER), eq(customer))).thenReturn(new Comment());

        InboundEmailResponse response = inboundEmailService.processInboundEmail(request);

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals("COMMENT_ADDED", response.getAction());
        assertEquals(50L, response.getTicketId());
        verify(commentService, times(1)).addComment(eq(50L), any(CommentRequest.class), eq(1L), eq(Role.END_USER), eq(customer));
    }

    @Test
    void testInboundNewTicketCreated() {
        InboundEmailRequest request = new InboundEmailRequest();
        request.setFrom("newuser@iocl.com");
        request.setTo("support@ticketpro.com");
        request.setSubject("Need access to VPN portal");
        request.setBodyPlain("Please grant VPN access for remote work.");

        when(userRepository.findByEmail("newuser@iocl.com")).thenReturn(Optional.of(customer));
        when(ticketService.createTicket(any(TicketRequest.class), any(), eq(customer))).thenReturn(ticket);

        InboundEmailResponse response = inboundEmailService.processInboundEmail(request);

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals("TICKET_CREATED", response.getAction());
        verify(ticketService, times(1)).createTicket(any(TicketRequest.class), any(), eq(customer));
    }
}
