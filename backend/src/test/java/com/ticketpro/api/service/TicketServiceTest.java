package com.ticketpro.api.service;

import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.SlaPolicyRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserService userService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SlaPolicyRepository slaPolicyRepository;

    @InjectMocks
    private TicketService ticketService;

    private Company testCompany;
    private User testUser;

    @BeforeEach
    void setUp() {
        testCompany = new Company();
        testCompany.setId(1L);
        testCompany.setCompanyName("Test Corp");
        testCompany.setCompanyCode("TESTCORP");

        testUser = new User();
        testUser.setId(10L);
        testUser.setName("John Doe");
        testUser.setEmail("john@test.com");
        testUser.setCompany(testCompany);
        testUser.setRole(Role.END_USER);
    }

    @Test
    void testCreateTicketSuccessfully() {
        TicketRequest request = new TicketRequest();
        request.setSubject("System Outage");
        request.setDescription("Cannot login to portal");
        request.setPriority(Priority.HIGH);

        when(slaPolicyRepository.findByCompanyIdAndPriority(eq(1L), eq(Priority.HIGH)))
                .thenReturn(Optional.empty());
        when(ticketRepository.existsByTicketNumber(anyString())).thenReturn(false);
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Ticket created = ticketService.createTicket(request, testCompany, testUser);

        assertNotNull(created);
        assertEquals("System Outage", created.getSubject());
        assertEquals(TicketStatus.OPEN, created.getStatus());
        assertEquals(Priority.HIGH, created.getPriority());
        assertNotNull(created.getTicketNumber());
        assertTrue(created.getTicketNumber().startsWith("#TESTCORP-"));
        assertNotNull(created.getSlaResolutionDeadline());
        assertFalse(created.getSlaBreached());
        verify(ticketRepository, times(1)).save(any(Ticket.class));
    }

    @Test
    void testUpdateTicketStatus() {
        Ticket ticket = new Ticket();
        ticket.setId(100L);
        ticket.setCompany(testCompany);
        ticket.setCreatedBy(testUser);
        ticket.setStatus(TicketStatus.OPEN);

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TicketRequest updateReq = new TicketRequest();
        updateReq.setStatus(TicketStatus.RESOLVED);

        Ticket updated = ticketService.updateTicket(100L, updateReq, 1L, Role.COMPANY_ADMIN, 10L);

        assertEquals(TicketStatus.RESOLVED, updated.getStatus());
        assertNotNull(updated.getResolvedAt());
        verify(ticketRepository, times(1)).save(ticket);
    }
}
