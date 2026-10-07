package com.ticketpro.api.service;

import com.ticketpro.api.dto.TicketHistoryResponse;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.FeedbackRepository;
import com.ticketpro.api.repository.TicketHistoryRepository;
import com.ticketpro.api.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CsatSecurityAndHistoryTest {

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private TicketHistoryRepository ticketHistoryRepository;

    @InjectMocks
    private FeedbackService feedbackService;

    @InjectMocks
    private TicketHistoryService ticketHistoryService;

    private Company companyA;
    private User customer;
    private Ticket ticket;

    @BeforeEach
    void setUp() {
        companyA = new Company();
        companyA.setId(1L);
        companyA.setCompanyCode("ACME");

        customer = new User();
        customer.setId(10L);
        customer.setEmail("customer@acme.com");
        customer.setName("John Customer");
        customer.setRole(Role.END_USER);
        customer.setCompany(companyA);

        ticket = new Ticket();
        ticket.setId(100L);
        ticket.setTicketNumber("#ACME-100");
        ticket.setCompany(companyA);
        ticket.setCreatedBy(customer);
        ticket.setStatus(TicketStatus.RESOLVED);

        ReflectionTestUtils.setField(feedbackService, "csatSecret", "TestSecretKey12345678901234567890");
        ReflectionTestUtils.setField(feedbackService, "csatExpirationDays", 30);
    }

    @Test
    @DisplayName("CSAT: Valid signed HMAC token verifies successfully")
    void testValidHmacTokenVerification() {
        String token = feedbackService.generateRatingToken(ticket.getId(), customer.getEmail());

        assertTrue(feedbackService.verifyRatingToken(ticket.getId(), customer.getEmail(), token),
                "Validly signed HMAC token must pass verification");
    }

    @Test
    @DisplayName("CSAT: Tampered token signature fails verification")
    void testTamperedTokenVerification() {
        String token = feedbackService.generateRatingToken(ticket.getId(), customer.getEmail());
        String tamperedToken = token.substring(0, token.length() - 4) + "XXXX";

        assertFalse(feedbackService.verifyRatingToken(ticket.getId(), customer.getEmail(), tamperedToken),
                "Tampered signature must be rejected");
    }

    @Test
    @DisplayName("CSAT: Token generated for Ticket 100 fails verification on Ticket 200")
    void testWrongTicketTokenVerification() {
        String token = feedbackService.generateRatingToken(100L, customer.getEmail());

        assertFalse(feedbackService.verifyRatingToken(200L, customer.getEmail(), token),
                "Token for ticket 100 must not be valid for ticket 200");
    }

    @Test
    @DisplayName("CSAT: Token generated for User A fails verification for User B")
    void testWrongRecipientTokenVerification() {
        String token = feedbackService.generateRatingToken(ticket.getId(), "userA@acme.com");

        assertFalse(feedbackService.verifyRatingToken(ticket.getId(), "userB@acme.com", token),
                "Token for user A must not be valid for user B");
    }

    @Test
    @DisplayName("CSAT: Expired token fails verification")
    void testExpiredTokenVerification() {
        long pastExpiry = System.currentTimeMillis() - 10000L; // 10 seconds in the past
        String expiredToken = FeedbackService.generateSignedToken(ticket.getId(), customer.getEmail(), pastExpiry, "TestSecretKey12345678901234567890");

        assertFalse(feedbackService.verifyRatingToken(ticket.getId(), customer.getEmail(), expiredToken),
                "Expired CSAT token must be rejected");
    }

    @Test
    @DisplayName("CSAT: Duplicate feedback submission is rejected")
    void testDuplicateFeedbackRejected() {
        String token = feedbackService.generateRatingToken(ticket.getId(), customer.getEmail());

        Feedback existingFeedback = new Feedback();
        existingFeedback.setId(5L);
        existingFeedback.setRating(4);

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));
        when(feedbackRepository.findByTicketId(100L)).thenReturn(Optional.of(existingFeedback));

        assertThrows(IllegalStateException.class, () -> {
            feedbackService.submitEmailRating(100L, 5, "Duplicate attempt", null, token);
        });
    }

    @Test
    @DisplayName("TicketHistory: Changes recorded and isolated by tenant")
    void testTicketHistoryIsolation() {
        TicketHistory h1 = new TicketHistory(ticket, "STATUS_CHANGED", "status", "OPEN", "RESOLVED", customer);
        h1.setId(1L);
        h1.setCreatedAt(LocalDateTime.now());

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));
        when(ticketHistoryRepository.findByTicketIdOrderByCreatedAtDesc(100L)).thenReturn(List.of(h1));

        // Company Admin from same company can access
        List<TicketHistoryResponse> history = ticketHistoryService.getHistoryByTicket(100L, companyA.getId(), Role.COMPANY_ADMIN, 999L);
        assertEquals(1, history.size());
        assertEquals("STATUS_CHANGED", history.get(0).getAction());

        // Company Admin from different company is rejected
        assertThrows(SecurityException.class, () -> {
            ticketHistoryService.getHistoryByTicket(100L, 999L, Role.COMPANY_ADMIN, 999L);
        });

        // Another End User is rejected
        assertThrows(SecurityException.class, () -> {
            ticketHistoryService.getHistoryByTicket(100L, companyA.getId(), Role.END_USER, 999L);
        });
    }

    @Test
    @DisplayName("Issue 3 - Test 5: Java source code does not contain hardcoded CSAT secrets")
    void testNoHardcodedSecretInSourceCode() throws Exception {
        java.io.File sourceDir = new java.io.File("src/main/java");
        assertTrue(sourceDir.exists(), "Source directory must exist");

        List<java.io.File> javaFiles = new ArrayList<>();
        collectJavaFiles(sourceDir, javaFiles);
        assertFalse(javaFiles.isEmpty(), "Should find Java source files");

        for (java.io.File file : javaFiles) {
            String content = java.nio.file.Files.readString(file.toPath());
            assertFalse(content.contains("TicketPro_CSAT_2026_SecureSecret"),
                    "File " + file.getName() + " contains forbidden secret 'TicketPro_CSAT_2026_SecureSecret'");
            assertFalse(content.contains("TicketPro_Secure_CSAT_Hmac_Secret_Key_2026_Prod"),
                    "File " + file.getName() + " contains forbidden secret 'TicketPro_Secure_CSAT_Hmac_Secret_Key_2026_Prod'");
        }
    }

    private void collectJavaFiles(java.io.File dir, List<java.io.File> list) {
        java.io.File[] files = dir.listFiles();
        if (files == null) return;
        for (java.io.File f : files) {
            if (f.isDirectory()) {
                collectJavaFiles(f, list);
            } else if (f.getName().endsWith(".java")) {
                list.add(f);
            }
        }
    }
}
