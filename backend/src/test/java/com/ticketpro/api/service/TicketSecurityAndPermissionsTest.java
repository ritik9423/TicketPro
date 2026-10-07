package com.ticketpro.api.service;

import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketSecurityAndPermissionsTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private TicketHistoryService ticketHistoryService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private TicketService ticketService;

    private Company tenantA;
    private Company tenantB;
    private User endUserA;
    private User agentA;
    private User agentA2;
    private User managerA;
    private User adminA;
    private User superAdmin;
    private Ticket ticketA;

    @BeforeEach
    void setUp() {
        tenantA = new Company();
        tenantA.setId(1L);
        tenantA.setCompanyCode("ACME");
        tenantA.setCompanyName("Acme Corp");

        tenantB = new Company();
        tenantB.setId(2L);
        tenantB.setCompanyCode("BETA");
        tenantB.setCompanyName("Beta Corp");

        endUserA = new User();
        endUserA.setId(10L);
        endUserA.setEmail("user@acme.com");
        endUserA.setRole(Role.END_USER);
        endUserA.setCompany(tenantA);

        agentA = new User();
        agentA.setId(20L);
        agentA.setEmail("agent@acme.com");
        agentA.setRole(Role.AGENT);
        agentA.setCompany(tenantA);

        agentA2 = new User();
        agentA2.setId(21L);
        agentA2.setEmail("agent2@acme.com");
        agentA2.setRole(Role.AGENT);
        agentA2.setCompany(tenantA);

        managerA = new User();
        managerA.setId(30L);
        managerA.setEmail("manager@acme.com");
        managerA.setRole(Role.MANAGER);
        managerA.setCompany(tenantA);

        adminA = new User();
        adminA.setId(40L);
        adminA.setEmail("admin@acme.com");
        adminA.setRole(Role.COMPANY_ADMIN);
        adminA.setCompany(tenantA);

        superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setEmail("super@ticketpro.com");
        superAdmin.setRole(Role.SUPER_ADMIN);

        ticketA = new Ticket();
        ticketA.setId(100L);
        ticketA.setTicketNumber("#ACME-100");
        ticketA.setCompany(tenantA);
        ticketA.setCreatedBy(endUserA);
        ticketA.setAssignedTo(agentA);
        ticketA.setStatus(TicketStatus.OPEN);
        ticketA.setPriority(Priority.LOW);
        ticketA.setDepartment("Support");
        ticketA.setSubject("Test Ticket");
        ticketA.setDescription("Test Description");

        org.springframework.test.util.ReflectionTestUtils.setField(ticketService, "ticketHistoryService", ticketHistoryService);
    }

    @Test
    @DisplayName("END_USER cannot change ticket status")
    void testEndUserCannotChangeStatus() {
        TicketRequest request = new TicketRequest();
        request.setStatus(TicketStatus.RESOLVED);

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.END_USER, tenantA.getId(), endUserA.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("END_USER cannot change ticket priority")
    void testEndUserCannotChangePriority() {
        TicketRequest request = new TicketRequest();
        request.setPriority(Priority.CRITICAL);

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.END_USER, tenantA.getId(), endUserA.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("END_USER cannot assign ticket")
    void testEndUserCannotAssignTicket() {
        TicketRequest request = new TicketRequest();
        request.setAssignedToId(agentA2.getId());

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.END_USER, tenantA.getId(), endUserA.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("END_USER cannot change ticket department")
    void testEndUserCannotChangeDepartment() {
        TicketRequest request = new TicketRequest();
        request.setDepartment("Finance");

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.END_USER, tenantA.getId(), endUserA.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("END_USER cannot modify another user's ticket")
    void testEndUserCannotModifyOtherUsersTicket() {
        TicketRequest request = new TicketRequest();
        request.setSubject("New Subject");

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.END_USER, tenantA.getId(), 999L, ticketA, request);
        });
    }

    @Test
    @DisplayName("AGENT cannot change ticket company")
    void testAgentCannotChangeCompany() {
        TicketRequest request = new TicketRequest();
        request.setCompanyCode("BETA");

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.AGENT, tenantA.getId(), agentA.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("AGENT cannot reassign ticket department")
    void testAgentCannotChangeDepartment() {
        TicketRequest request = new TicketRequest();
        request.setDepartment("Engineering");

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.AGENT, tenantA.getId(), agentA.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("AGENT cannot reassign ticket to another agent")
    void testAgentCannotReassignToOtherAgent() {
        TicketRequest request = new TicketRequest();
        request.setAssignedToId(agentA2.getId());

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.AGENT, tenantA.getId(), agentA.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("MANAGER cannot modify ticket of another tenant")
    void testManagerCannotModifyOtherTenant() {
        TicketRequest request = new TicketRequest();
        request.setStatus(TicketStatus.IN_PROGRESS);

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.MANAGER, tenantB.getId(), managerA.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("COMPANY_ADMIN cannot modify ticket of another tenant")
    void testCompanyAdminCannotModifyOtherTenant() {
        TicketRequest request = new TicketRequest();
        request.setSubject("Malicious update");

        assertThrows(SecurityException.class, () -> {
            ticketService.validateTicketUpdatePermissions(Role.COMPANY_ADMIN, tenantB.getId(), adminA.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("SUPER_ADMIN can manage cross-tenant tickets")
    void testSuperAdminCanModifyCrossTenant() {
        TicketRequest request = new TicketRequest();
        request.setStatus(TicketStatus.CLOSED);

        assertDoesNotThrow(() -> {
            ticketService.validateTicketUpdatePermissions(Role.SUPER_ADMIN, null, superAdmin.getId(), ticketA, request);
        });
    }

    @Test
    @DisplayName("Soft delete marks ticket as deleted without deleting comments or attachments")
    void testSoftDelete() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticketA));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ticketService.deleteTicket(100L, tenantA.getId(), Role.COMPANY_ADMIN, adminA);

        assertTrue(ticketA.getDeleted());
        assertNotNull(ticketA.getDeletedAt());
        assertEquals(adminA, ticketA.getDeletedBy());
        verify(ticketRepository).save(ticketA);
        verify(ticketRepository, never()).delete((Ticket) any());
        verify(ticketHistoryService).recordChange(eq(ticketA), eq("TICKET_DELETED"), eq("deleted"), eq("false"), eq("true"), eq(adminA));
    }

    @Test
    @DisplayName("Cross-tenant soft delete is forbidden")
    void testCrossTenantDeleteForbidden() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticketA));

        assertThrows(SecurityException.class, () -> {
            ticketService.deleteTicket(100L, tenantB.getId(), Role.COMPANY_ADMIN, adminA);
        });

        verify(ticketRepository, never()).save(any());
    }

    @Test
    @DisplayName("Restore soft-deleted ticket succeeds for admin")
    void testRestoreTicket() {
        ticketA.setDeleted(true);
        when(ticketRepository.findRawById(100L)).thenReturn(Optional.of(ticketA));

        Ticket restored = ticketService.restoreTicket(100L, tenantA.getId(), Role.COMPANY_ADMIN, adminA);

        assertFalse(restored.getDeleted());
        assertNull(restored.getDeletedAt());
        assertNull(restored.getDeletedBy());
        verify(ticketRepository).restoreTicketById(100L);
        verify(ticketHistoryService).recordChange(eq(ticketA), eq("TICKET_RESTORED"), eq("deleted"), eq("true"), eq("false"), eq(adminA));
    }
}
