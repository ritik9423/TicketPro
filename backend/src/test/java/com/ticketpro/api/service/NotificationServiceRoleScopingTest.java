package com.ticketpro.api.service;

import com.ticketpro.api.entity.Notification;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceRoleScopingTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository);
        ReflectionTestUtils.setField(notificationService, "messagingTemplate", messagingTemplate);
    }

    @Test
    @DisplayName("End-User sees only their own notifications and never internal notes or SLA breaches")
    void endUser_SeesOnlyOwnNotifications_AndNoInternalNotesOrSla() {
        Notification userReceipt = new Notification("customer@acme.com", "Ticket Received", "Ticket #1 logged", "TICKET_CREATED", "ACME", "USER", "/tickets/1");
        Notification agentReply = new Notification("customer@acme.com", "Agent Replied", "Hi customer", "TICKET_REPLY", "ACME", "USER", "/tickets/1");
        Notification otherUserReceipt = new Notification("other@acme.com", "Ticket Received", "Ticket #2 logged", "TICKET_CREATED", "ACME", "USER", "/tickets/2");
        Notification internalNote = new Notification("customer@acme.com", "Internal Note", "Secret staff note", "INTERNAL_NOTE", "ACME", "AGENT", "/tickets/1");
        Notification slaBreach = new Notification("customer@acme.com", "SLA Breach", "Ticket breached", "SLA_BREACH", "ACME", "COMPANY_ADMIN", "/tickets/1");

        when(notificationRepository.findByTenantIdOrderByCreatedAtDesc("ACME"))
                .thenReturn(List.of(userReceipt, agentReply, otherUserReceipt, internalNote, slaBreach));

        List<Notification> scoped = notificationService.getScopedNotifications("customer@acme.com", "ACME", Role.END_USER);

        assertEquals(2, scoped.size());
        assertTrue(scoped.stream().anyMatch(n -> n.getTitle().equals("Ticket Received")));
        assertTrue(scoped.stream().anyMatch(n -> n.getTitle().equals("Agent Replied")));
        assertFalse(scoped.stream().anyMatch(n -> n.getTitle().equals("Internal Note")));
        assertFalse(scoped.stream().anyMatch(n -> n.getTitle().equals("SLA Breach")));
        assertFalse(scoped.stream().anyMatch(n -> "other@acme.com".equals(n.getRecipientEmail())));
    }

    @Test
    @DisplayName("Agent sees only notifications addressed to them, not other agents or end-user receipts")
    void agent_SeesOnlyAssignedNotifications() {
        Notification agent1Assigned = new Notification("agent1@acme.com", "Ticket Assigned", "Ticket #1 assigned", "TICKET_ASSIGNED", "ACME", "AGENT", "/tickets/1");
        Notification agent2Assigned = new Notification("agent2@acme.com", "Ticket Assigned", "Ticket #2 assigned", "TICKET_ASSIGNED", "ACME", "AGENT", "/tickets/2");
        Notification customerReceipt = new Notification("customer@acme.com", "Ticket Received", "Logged", "TICKET_CREATED", "ACME", "USER", "/tickets/1");
        Notification generalAgentBroadcast = new Notification(null, "Queue Alert", "High volume today", "SYSTEM_ALERT", "ACME", "AGENT", "/tickets");

        when(notificationRepository.findByTenantIdOrderByCreatedAtDesc("ACME"))
                .thenReturn(List.of(agent1Assigned, agent2Assigned, customerReceipt, generalAgentBroadcast));

        List<Notification> scoped = notificationService.getScopedNotifications("agent1@acme.com", "ACME", Role.AGENT);

        assertEquals(2, scoped.size());
        assertTrue(scoped.stream().anyMatch(n -> n.getTitle().equals("Ticket Assigned")));
        assertTrue(scoped.stream().anyMatch(n -> n.getTitle().equals("Queue Alert")));
        assertFalse(scoped.stream().anyMatch(n -> "agent2@acme.com".equals(n.getRecipientEmail())));
        assertFalse(scoped.stream().anyMatch(n -> "customer@acme.com".equals(n.getRecipientEmail())));
    }

    @Test
    @DisplayName("Company Admin sees unassigned tickets, SLA escalations, but not customer personal receipts")
    void companyAdmin_SeesUnassignedAndSla_NotPersonalReceipts() {
        Notification unassigned = new Notification(null, "Unassigned Ticket", "Ticket #1 needs agent", "TICKET_UNASSIGNED", "ACME", "COMPANY_ADMIN", "/tickets/1");
        Notification slaBreach = new Notification(null, "SLA Breached", "Ticket #2 breached", "SLA_BREACH", "ACME", "COMPANY_ADMIN", "/tickets/2");
        Notification customerReceipt = new Notification("customer@acme.com", "Ticket Received", "Logged", "TICKET_CREATED", "ACME", "USER", "/tickets/1");
        Notification directAdminNotif = new Notification("admin@acme.com", "Profile Updated", "Settings saved", "SYSTEM_ALERT", "ACME", "COMPANY_ADMIN", "/settings");

        when(notificationRepository.findByTenantIdOrderByCreatedAtDesc("ACME"))
                .thenReturn(List.of(unassigned, slaBreach, customerReceipt, directAdminNotif));

        List<Notification> scoped = notificationService.getScopedNotifications("admin@acme.com", "ACME", Role.COMPANY_ADMIN);

        assertEquals(3, scoped.size());
        assertTrue(scoped.stream().anyMatch(n -> n.getTitle().equals("Unassigned Ticket")));
        assertTrue(scoped.stream().anyMatch(n -> n.getTitle().equals("SLA Breached")));
        assertTrue(scoped.stream().anyMatch(n -> n.getTitle().equals("Profile Updated")));
        assertFalse(scoped.stream().anyMatch(n -> n.getTitle().equals("Ticket Received")));
    }

    @Test
    @DisplayName("Super Admin sees only global platform and onboarding alerts, never tenant internal chatter")
    void superAdmin_SeesOnlyGlobalAndOnboarding() {
        Notification onboarding = new Notification("superadmin@ticketpro.com", "New Company Onboarding", "ACME Corp", "COMPANY_ONBOARDING", "GLOBAL", "SUPER_ADMIN", "/companies");
        Notification direct = new Notification("superadmin@ticketpro.com", "System Alert", "Node healthy", "SYSTEM_ALERT", "GLOBAL", "SUPER_ADMIN", "/dashboard");

        when(notificationRepository.findByTenantIdOrderByCreatedAtDesc("GLOBAL"))
                .thenReturn(List.of(onboarding, direct));
        when(notificationRepository.findByRecipientEmailOrderByCreatedAtDesc("superadmin@ticketpro.com"))
                .thenReturn(List.of(onboarding, direct));

        List<Notification> scoped = notificationService.getScopedNotifications("superadmin@ticketpro.com", null, Role.SUPER_ADMIN);

        assertEquals(2, scoped.size());
        assertTrue(scoped.stream().allMatch(n -> "GLOBAL".equals(n.getTenantId())));
    }

    @Test
    @DisplayName("WebSocket targeted delivery sends personal notifications ONLY to user channel, not entire tenant")
    void webSocket_PersonalNotification_SendsOnlyToUserChannel() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.saveNotification("customer@acme.com", "Ticket Received", "Ticket #1 logged", "TICKET_CREATED", "ACME", "USER", "/tickets/1");

        // Verify sent to user private channel
        verify(messagingTemplate).convertAndSend(eq("/topic/notifications/user/customer@acme.com"), any(Notification.class));
        // Verify NOT broadcast to entire tenant channel
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/notifications/ACME"), any(Notification.class));
    }

    @Test
    @DisplayName("WebSocket role-specific notification for Company Admin sends to /admin channel")
    void webSocket_AdminAlert_SendsToAdminChannel() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.saveNotification(null, "Unassigned Ticket", "Ticket #1 needs assignment", "TICKET_UNASSIGNED", "ACME", "COMPANY_ADMIN", "/tickets/1");

        // Verify sent to admin channel
        verify(messagingTemplate).convertAndSend(eq("/topic/notifications/ACME/admin"), any(Notification.class));
        // Verify NOT broadcast to entire tenant
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/notifications/ACME"), any(Notification.class));
    }
}
