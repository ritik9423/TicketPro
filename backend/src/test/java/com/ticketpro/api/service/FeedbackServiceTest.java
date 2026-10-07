package com.ticketpro.api.service;

import com.ticketpro.api.dto.FeedbackRequest;
import com.ticketpro.api.dto.FeedbackResponse;
import com.ticketpro.api.dto.TicketResponse;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.FeedbackRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private FeedbackService feedbackService;

    private Company testCompany;
    private User testCustomer;
    private User testAgent;
    private Ticket testTicket;

    @BeforeEach
    void setUp() {
        testCompany = new Company();
        testCompany.setId(1L);
        testCompany.setCompanyName("Indian Oil Corporation");
        testCompany.setCompanyCode("IOCL");

        testCustomer = new User();
        testCustomer.setId(10L);
        testCustomer.setName("Ritik Kumar");
        testCustomer.setEmail("customer@iocl.com");
        testCustomer.setRole(Role.END_USER);
        testCustomer.setCompany(testCompany);

        testAgent = new User();
        testAgent.setId(20L);
        testAgent.setName("Alex Support");
        testAgent.setEmail("agent@iocl.com");
        testAgent.setRole(Role.AGENT);
        testAgent.setCompany(testCompany);

        testTicket = new Ticket();
        testTicket.setId(100L);
        testTicket.setTicketNumber("#IOCL-100");
        testTicket.setSubject("Database connection timeout");
        testTicket.setStatus(TicketStatus.RESOLVED);
        testTicket.setCompany(testCompany);
        testTicket.setCreatedBy(testCustomer);
        testTicket.setAssignedTo(testAgent);

        org.springframework.test.util.ReflectionTestUtils.setField(feedbackService, "csatSecret", "TestSecretKey12345678901234567890");
        org.springframework.test.util.ReflectionTestUtils.setField(feedbackService, "csatExpirationDays", 30);
    }

    @Test
    void testSubmitFeedback_Success() {
        FeedbackRequest request = new FeedbackRequest();
        request.setRating(5);
        request.setFeedback("Super fast resolution, thank you!");
        request.setTags(List.of("⚡ Fast Resolution", "💡 Solved First Time"));

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(feedbackRepository.findByTicketId(100L)).thenReturn(Optional.empty());
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(invocation -> {
            Feedback f = invocation.getArgument(0);
            f.setId(1L);
            return f;
        });

        FeedbackResponse response = feedbackService.submitFeedback(100L, request, testCustomer);

        assertNotNull(response);
        assertEquals(5, response.getRating());
        assertEquals("Super fast resolution, thank you!", response.getFeedback());
        assertEquals(5, testTicket.getSatisfactionRating());
        assertNotNull(testTicket.getSatisfactionRatedAt());

        verify(ticketRepository).save(testTicket);
        verify(feedbackRepository).save(any(Feedback.class));
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/tickets/GLOBAL"), any(Object.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/tickets/IOCL"), any(TicketResponse.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/tickets/100"), any(TicketResponse.class));
    }

    @Test
    void testSubmitEmailRating_SuccessWithToken() {
        String token = feedbackService.generateRatingToken(100L, testCustomer.getEmail());

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(feedbackRepository.findByTicketId(100L)).thenReturn(Optional.empty());
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(invocation -> {
            Feedback f = invocation.getArgument(0);
            f.setId(2L);
            return f;
        });

        FeedbackResponse response = feedbackService.submitEmailRating(100L, 5, "Great service via email!", "⚡ Fast Resolution", token);

        assertNotNull(response);
        assertEquals(5, response.getRating());
        assertEquals(5, testTicket.getSatisfactionRating());
        assertEquals("Great service via email!", testTicket.getSatisfactionFeedback());

        // Verify WebSocket broadcast
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/tickets/GLOBAL"), any(Object.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/tickets/IOCL"), any(TicketResponse.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/feedback/IOCL"), any(FeedbackResponse.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/tickets/100"), any(TicketResponse.class));
    }

    @Test
    void testSubmitEmailRating_InvalidTokenThrowsSecurityException() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));

        assertThrows(SecurityException.class, () -> {
            feedbackService.submitEmailRating(100L, 5, "Hacking attempt", null, "invalid-bogus-token-12345");
        });

        verify(ticketRepository, never()).save(any());
        verify(feedbackRepository, never()).save(any());
    }

    @Test
    void testSubmitFeedback_StaffCannotRate() {
        FeedbackRequest request = new FeedbackRequest();
        request.setRating(5);

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));

        assertThrows(SecurityException.class, () -> {
            feedbackService.submitFeedback(100L, request, testAgent);
        });
    }

    @Test
    void testUpdateFeedbackComment() {
        String token = feedbackService.generateRatingToken(100L, testCustomer.getEmail());

        Feedback existingFeedback = new Feedback();
        existingFeedback.setId(10L);
        existingFeedback.setTicket(testTicket);
        existingFeedback.setCompany(testCompany);
        existingFeedback.setRating(5);

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(testTicket));
        when(feedbackRepository.findByTicketId(100L)).thenReturn(Optional.of(existingFeedback));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));
        when(feedbackRepository.save(any(Feedback.class))).thenAnswer(inv -> inv.getArgument(0));

        FeedbackResponse response = feedbackService.updateFeedbackComment(100L, "Added extra praise!", "🤝 Helpful & Polite", token);

        assertNotNull(response);
        assertEquals("Added extra praise!", response.getFeedback());
        assertEquals("🤝 Helpful & Polite", response.getTags());
        verify(messagingTemplate, never()).convertAndSend(eq("/topic/tickets/GLOBAL"), any(Object.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/tickets/IOCL"), any(TicketResponse.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/tickets/100"), any(TicketResponse.class));
    }
}
