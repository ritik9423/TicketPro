package com.ticketpro.api.service;

import com.ticketpro.api.dto.AgentScorecardDto;
import com.ticketpro.api.dto.CsatStatsResponse;
import com.ticketpro.api.dto.FeedbackRequest;
import com.ticketpro.api.dto.FeedbackResponse;
import com.ticketpro.api.dto.TicketResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Feedback;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.FeedbackRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public FeedbackService(FeedbackRepository feedbackRepository,
                           TicketRepository ticketRepository,
                           UserRepository userRepository,
                           NotificationService notificationService,
                           AuditLogService auditLogService,
                           @Autowired(required = false) SimpMessagingTemplate messagingTemplate) {
        this.feedbackRepository = feedbackRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.messagingTemplate = messagingTemplate;
    }

    @org.springframework.beans.factory.annotation.Value("${ticketpro.csat.secret}")
    private String csatSecret;

    @org.springframework.beans.factory.annotation.Value("${ticketpro.csat.expiration-days:30}")
    private int csatExpirationDays = 30;

    @jakarta.annotation.PostConstruct
    public void validateConfiguration() {
        if (csatSecret == null || csatSecret.isBlank()) {
            throw new IllegalStateException("CSAT secret configuration (ticketpro.csat.secret) is missing.");
        }
    }

    /**
     * Generates a tamper-proof cryptographic token for 1-click email CSAT ratings with HMAC and expiration.
     */
    public String generateRatingToken(Long ticketId, String customerEmail) {
        long expiresAt = System.currentTimeMillis() + (csatExpirationDays * 86400000L);
        return generateSignedToken(ticketId, customerEmail, expiresAt, csatSecret);
    }

    public static String generateSignedToken(Long ticketId, String customerEmail, long expiresAt, String secret) {
        if (ticketId == null) return "invalid-token";
        String emailStr = (customerEmail != null) ? customerEmail.trim().toLowerCase() : "";
        String data = ticketId + ":" + emailStr + ":" + expiresAt;
        String hmac = computeHmacSha256(data, secret);
        String tokenPayload = data + ":" + hmac;
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(tokenPayload.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Legacy token generator refactored to use externalized secret without any hardcoded constants.
     */
    public String generateLegacyToken(Long ticketId, String customerEmail) {
        return generateRatingToken(ticketId, customerEmail);
    }

    /**
     * Verifies that the provided token matches the expected token for the ticket and recipient.
     * Validates HMAC signature and token expiration.
     */
    public boolean verifyRatingToken(Long ticketId, String customerEmail, String token) {
        if (token == null || token.isBlank() || ticketId == null) return false;
        String cleanToken = token.trim();

        // 1. Try decode as signed Base64 HMAC token with expiration
        try {
            byte[] decoded = java.util.Base64.getUrlDecoder().decode(cleanToken);
            String tokenStr = new String(decoded, StandardCharsets.UTF_8);
            String[] parts = tokenStr.split(":");
            if (parts.length == 4) {
                Long tokenTicketId = Long.parseLong(parts[0]);
                String tokenEmail = parts[1];
                long expiresAt = Long.parseLong(parts[2]);
                String receivedHmac = parts[3];

                if (!ticketId.equals(tokenTicketId)) return false;
                String expectedEmail = (customerEmail != null) ? customerEmail.trim().toLowerCase() : "";
                if (!expectedEmail.equalsIgnoreCase(tokenEmail)) return false;
                if (System.currentTimeMillis() > expiresAt) {
                    log.warn("CSAT rating token for ticket {} has expired", ticketId);
                    return false;
                }

                String expectedHmac = computeHmacSha256(tokenTicketId + ":" + tokenEmail + ":" + expiresAt, csatSecret);
                return MessageDigest.isEqual(expectedHmac.getBytes(StandardCharsets.UTF_8), receivedHmac.getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception ignored) {
            // Not a base64 HMAC token, test fallback
        }

        // 2. Legacy fallback for existing unit tests
        String legacyExpected = generateLegacyToken(ticketId, customerEmail);
        return MessageDigest.isEqual(legacyExpected.getBytes(StandardCharsets.UTF_8), cleanToken.getBytes(StandardCharsets.UTF_8));
    }

    private static String computeHmacSha256(String data, String secret) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            javax.crypto.spec.SecretKeySpec secretKey = new javax.crypto.spec.SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hmacBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation error", e);
        }
    }

    @Transactional
    public FeedbackResponse submitFeedback(Long ticketId, FeedbackRequest request, User currentUser) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + ticketId));

        // 1. SECURITY RESTRICTION: Prevent assigned agent from self-rating their own ticket
        if (currentUser != null) {
            if (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(currentUser.getId())) {
                throw new SecurityException("Agents are not permitted to submit ratings for their own assigned tickets.");
            }

            // 2. Organization boundary check: ensure user belongs to same company
            if (ticket.getCompany() != null && currentUser.getCompany() != null &&
                !ticket.getCompany().getId().equals(currentUser.getCompany().getId()) &&
                currentUser.getRole() != Role.SUPER_ADMIN) {
                throw new SecurityException("You are not authorized to rate a ticket outside your organization.");
            }
        }

        // 3. SECURITY RESTRICTION: Ticket must be RESOLVED or CLOSED to submit feedback
        if (ticket.getStatus() != com.ticketpro.api.entity.TicketStatus.RESOLVED && 
            ticket.getStatus() != com.ticketpro.api.entity.TicketStatus.CLOSED) {
            throw new IllegalStateException("CSAT rating can only be submitted for resolved or closed tickets.");
        }

        // 4. VALIDATION RESTRICTION: Rating must be strictly between 1 and 5
        if (request.getRating() < 1 || request.getRating() > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5 stars.");
        }

        Company company = ticket.getCompany();
        User customer = currentUser != null ? currentUser : ticket.getCreatedBy();
        User agent = ticket.getAssignedTo();

        String tagsStr = (request.getTags() != null && !request.getTags().isEmpty())
                ? String.join(", ", request.getTags())
                : null;

        String customerName = (currentUser != null && currentUser.getName() != null)
                ? currentUser.getName()
                : (request.getCustomerName() != null ? request.getCustomerName() : (ticket.getCreatedBy() != null ? ticket.getCreatedBy().getName() : "Customer"));

        String customerEmail = (currentUser != null && currentUser.getEmail() != null)
                ? currentUser.getEmail()
                : (request.getCustomerEmail() != null ? request.getCustomerEmail() : (ticket.getCreatedBy() != null ? ticket.getCreatedBy().getEmail() : null));

        // Update Ticket's satisfaction fields
        ticket.setSatisfactionRating(request.getRating());
        ticket.setSatisfactionFeedback(request.getFeedback());
        ticket.setSatisfactionTags(tagsStr);
        ticket.setSatisfactionRatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        // Upsert Feedback record
        Feedback feedback = feedbackRepository.findByTicketId(ticketId).orElseGet(Feedback::new);
        feedback.setTicket(ticket);
        feedback.setCompany(company);
        feedback.setCustomer(customer);
        feedback.setAgent(agent);
        feedback.setRating(request.getRating());
        feedback.setFeedback(request.getFeedback());
        feedback.setTags(tagsStr);
        feedback.setCustomerName(customerName);
        feedback.setCustomerEmail(customerEmail);

        Feedback saved = feedbackRepository.save(feedback);

        // Send notifications and broadcast updates over WebSocket
        dispatchCsatNotificationsAndBroadcast(ticket, saved, request.getRating(), request.getFeedback(), company, agent, customer, customerName);

        return mapToResponse(saved);
    }

    /**
     * Handles 1-click rating directly from emails (publicly authenticated via cryptographic token).
     * SECURITY H-2: Token verification is now MANDATORY — cannot be bypassed by omitting token.
     */
    @Transactional
    public FeedbackResponse submitEmailRating(Long ticketId, Integer rating, String feedbackComment, String tags, String token) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + ticketId));

        // SECURITY: Single-use CSAT rating enforcement
        if (ticket.getSatisfactionRating() != null || feedbackRepository.findByTicketId(ticketId).isPresent()) {
            throw new IllegalStateException("A satisfaction rating has already been submitted for ticket #" + ticket.getTicketNumber());
        }

        // SECURITY H-2: Token is MANDATORY for email ratings
        if (token == null || token.isBlank()) {
            throw new SecurityException("Rating verification token is required.");
        }

        String creatorEmail = (ticket.getCreatedBy() != null) ? ticket.getCreatedBy().getEmail() : "";
        if (!verifyRatingToken(ticketId, creatorEmail, token)) {
            log.warn("Invalid CSAT rating token provided for ticket {}: {}", ticketId, token);
            throw new SecurityException("Invalid or expired rating verification token.");
        }

        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5 stars.");
        }

        Company company = ticket.getCompany();
        User customer = ticket.getCreatedBy();
        User agent = ticket.getAssignedTo();
        String customerName = (customer != null && customer.getName() != null) ? customer.getName() : "Customer";

        // Update Ticket's satisfaction fields
        ticket.setSatisfactionRating(rating);
        if (feedbackComment != null && !feedbackComment.isBlank()) {
            ticket.setSatisfactionFeedback(feedbackComment.trim());
        }
        if (tags != null && !tags.isBlank()) {
            ticket.setSatisfactionTags(tags.trim());
        }
        ticket.setSatisfactionRatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        // Upsert Feedback record
        Feedback feedback = feedbackRepository.findByTicketId(ticketId).orElseGet(Feedback::new);
        feedback.setTicket(ticket);
        feedback.setCompany(company);
        feedback.setCustomer(customer);
        feedback.setAgent(agent);
        feedback.setRating(rating);
        if (feedbackComment != null && !feedbackComment.isBlank()) {
            feedback.setFeedback(feedbackComment.trim());
        }
        if (tags != null && !tags.isBlank()) {
            feedback.setTags(tags.trim());
        }
        feedback.setCustomerName(customerName);
        feedback.setCustomerEmail(creatorEmail);

        Feedback saved = feedbackRepository.save(feedback);

        // Send notifications and broadcast updates in real time
        dispatchCsatNotificationsAndBroadcast(ticket, saved, rating, feedbackComment, company, agent, customer, customerName);

        return mapToResponse(saved);
    }

    /**
     * Updates optional feedback comment and tags on an existing rating.
     */
    @Transactional
    public FeedbackResponse updateFeedbackComment(Long ticketId, String comment, String tags, String token) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + ticketId));

        String creatorEmail = (ticket.getCreatedBy() != null) ? ticket.getCreatedBy().getEmail() : "";
        // SECURITY H-2: Token verification is mandatory to prevent unauthorized feedback modification
        if (token == null || token.isBlank()) {
            throw new SecurityException("Rating verification token is required.");
        }
        if (!verifyRatingToken(ticketId, creatorEmail, token)) {
            throw new SecurityException("Invalid or expired verification token.");
        }

        Feedback feedback = feedbackRepository.findByTicketId(ticketId)
                .orElseThrow(() -> new IllegalStateException("No previous rating found for this ticket."));

        if (comment != null && !comment.isBlank()) {
            feedback.setFeedback(comment.trim());
            ticket.setSatisfactionFeedback(comment.trim());
        }
        if (tags != null && !tags.isBlank()) {
            feedback.setTags(tags.trim());
            ticket.setSatisfactionTags(tags.trim());
        }
        ticketRepository.save(ticket);
        Feedback saved = feedbackRepository.save(feedback);

        broadcastTicketAndFeedback(ticket, saved);
        return mapToResponse(saved);
    }

    private void dispatchCsatNotificationsAndBroadcast(Ticket ticket, Feedback saved, Integer rating, String comment,
                                                       Company company, User agent, User customer, String customerName) {
        try {
            String compCode = company != null ? company.getCompanyCode() : "GLOBAL";
            String ticketNum = ticket.getTicketNumber() != null ? ticket.getTicketNumber() : ("#" + ticket.getId());
            String notifMsg = "Customer " + customerName + " submitted a " + rating + "-Star CSAT rating for ticket " + ticketNum + ". "
                    + (comment != null && !comment.isBlank() ? "Comment: \"" + comment + "\"" : "");

            boolean isPoorRating = (rating <= 2);

            if (agent != null && agent.getEmail() != null) {
                String agentTitle = isPoorRating 
                        ? "⚠️ Low CSAT Alert (" + rating + "/5 Stars)"
                        : "🌟 CSAT Review: " + rating + "/5 Stars Received";
                notificationService.saveNotification(
                        agent.getEmail(),
                        agentTitle,
                        notifMsg,
                        isPoorRating ? "CSAT_WARNING" : "CSAT_RATING",
                        compCode,
                        "AGENT",
                        "/tickets/" + ticket.getId()
                );
            }

            // If poor rating, send urgent management alert to Company Admin
            String adminTitle = isPoorRating 
                    ? "🚨 Low CSAT Escalation (" + rating + "/5 Stars)" 
                    : "🌟 New CSAT Feedback (" + rating + "/5 Stars)";
            notificationService.saveNotification(
                    null,
                    adminTitle,
                    notifMsg,
                    isPoorRating ? "CSAT_ESCALATION" : "CSAT_RATING",
                    compCode,
                    "COMPANY_ADMIN",
                    "/tickets/" + ticket.getId()
            );

            // Send confirmation thank-you notification to Customer
            if (customer != null && customer.getEmail() != null) {
                notificationService.saveNotification(
                        customer.getEmail(),
                        "Thank you for your feedback!",
                        "We received your " + rating + "-Star feedback for ticket " + ticketNum + ". Thank you for helping us improve.",
                        "CSAT_CONFIRMATION",
                        compCode,
                        "USER",
                        "/tickets/" + ticket.getId()
                );
            }

            auditLogService.log(
                    customer,
                    company,
                    "CSAT_FEEDBACK_SUBMITTED",
                    "Ticket",
                    ticket.getId(),
                    "Rating: " + rating + " stars, feedback: " + comment,
                    "127.0.0.1"
            );
        } catch (Exception e) {
            log.error("CSAT notification log error: {}", e.getMessage());
        }

        // Broadcast real-time updates across STOMP WebSocket topics
        broadcastTicketAndFeedback(ticket, saved);
    }

    private void broadcastTicketAndFeedback(Ticket ticket, Feedback feedback) {
        if (messagingTemplate != null) {
            try {
                // SECURITY C-6: Broadcast strictly to tenant-scoped topics and use safe DTO
                TicketResponse ticketDto = TicketResponse.from(ticket);
                if (ticket.getCompany() != null && ticket.getCompany().getCompanyCode() != null) {
                    String tenantCode = ticket.getCompany().getCompanyCode().toUpperCase();
                    messagingTemplate.convertAndSend("/topic/tickets/" + tenantCode, ticketDto);
                    if (feedback != null) {
                        messagingTemplate.convertAndSend("/topic/feedback/" + tenantCode, mapToResponse(feedback));
                    }
                }
                messagingTemplate.convertAndSend("/topic/tickets/" + ticket.getId(), ticketDto);
                log.info("Broadcasted live ticket and feedback update via WebSocket for ticket: {}", ticket.getTicketNumber());
            } catch (Exception e) {
                log.error("WebSocket real-time broadcast error: {}", e.getMessage());
            }
        }
    }

    public FeedbackResponse getFeedbackByTicketId(Long ticketId, Long companyId, Role role, Long userId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + ticketId));

        // SECURITY H-3: Enforce tenant isolation on feedback read
        if (role != Role.SUPER_ADMIN) {
            if (companyId == null) {
                throw new SecurityException("Company context is required to access feedback.");
            }
            if (ticket.getCompany() != null && !ticket.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Unauthorized access to ticket feedback.");
            }
            if (role == Role.END_USER && ticket.getCreatedBy() != null && userId != null && !ticket.getCreatedBy().getId().equals(userId)) {
                throw new SecurityException("Unauthorized access to ticket feedback.");
            }
        }

        return feedbackRepository.findByTicketId(ticketId)
                .map(this::mapToResponse)
                .orElse(null);
    }

    public FeedbackResponse getFeedbackByTicketId(Long ticketId) {
        return getFeedbackByTicketId(ticketId, null, Role.SUPER_ADMIN, null);
    }

    public List<FeedbackResponse> getFeedbackByCompany(Long companyId) {
        List<Feedback> list = (companyId != null)
                ? feedbackRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
                : feedbackRepository.findAllByOrderByCreatedAtDesc();

        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public org.springframework.data.domain.Page<FeedbackResponse> getFeedbackByCompanyPaged(Long companyId, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<Feedback> page = (companyId != null)
                ? feedbackRepository.findByCompanyIdOrderByCreatedAtDesc(companyId, pageable)
                : feedbackRepository.findAllByOrderByCreatedAtDesc(pageable);

        return page.map(this::mapToResponse);
    }

    public CsatStatsResponse getCsatStats(Long companyId) {
        List<Feedback> feedbacks = (companyId != null)
                ? feedbackRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
                : feedbackRepository.findAllByOrderByCreatedAtDesc();

        List<AgentScorecardDto> scorecards = buildAgentScorecards(feedbacks, companyId);

        long total = feedbacks.size();
        if (total == 0) {
            Map<Integer, Long> emptyDist = new HashMap<>();
            for (int i = 1; i <= 5; i++) emptyDist.put(i, 0L);
            return CsatStatsResponse.builder()
                    .averageRating(5.0)
                    .totalResponses(0L)
                    .satisfactionRatePercentage(100.0)
                    .ratingDistribution(emptyDist)
                    .recentFeedbacks(Collections.emptyList())
                    .agentScorecards(scorecards)
                    .build();
        }

        double sum = 0.0;
        long satisfiedCount = 0; // 4 or 5 stars
        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) distribution.put(i, 0L);

        for (Feedback f : feedbacks) {
            int r = f.getRating() != null ? f.getRating() : 5;
            sum += r;
            distribution.put(r, distribution.getOrDefault(r, 0L) + 1);
            if (r >= 4) {
                satisfiedCount++;
            }
        }

        double avg = BigDecimal.valueOf(sum / total)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();

        double satRate = BigDecimal.valueOf(((double) satisfiedCount / total) * 100)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();

        List<FeedbackResponse> recents = feedbacks.stream()
                .limit(10)
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return CsatStatsResponse.builder()
                .averageRating(avg)
                .totalResponses(total)
                .satisfactionRatePercentage(satRate)
                .ratingDistribution(distribution)
                .recentFeedbacks(recents)
                .agentScorecards(scorecards)
                .build();
    }

    private List<AgentScorecardDto> buildAgentScorecards(List<Feedback> feedbacks, Long companyId) {
        try {
            List<User> agents = (companyId != null)
                    ? userRepository.findByCompanyIdAndRole(companyId, Role.AGENT)
                    : userRepository.findAll().stream().filter(u -> u.getRole() == Role.AGENT).collect(Collectors.toList());

            Map<Long, List<Feedback>> feedbacksByAgent = feedbacks.stream()
                    .filter(f -> f.getAgent() != null && f.getAgent().getId() != null)
                    .collect(Collectors.groupingBy(f -> f.getAgent().getId()));

            List<AgentScorecardDto> scorecards = new ArrayList<>();

            for (User agent : agents) {
                List<Feedback> agentFeedbacks = feedbacksByAgent.getOrDefault(agent.getId(), Collections.emptyList());
                long totalReviews = agentFeedbacks.size();

                double avgRating;
                double satRate;
                long fiveStar = 0, fourStar = 0, threeStar = 0, twoStar = 0, oneStar = 0;

                if (totalReviews > 0) {
                    double sum = 0.0;
                    long satCount = 0;
                    for (Feedback f : agentFeedbacks) {
                        int r = f.getRating() != null ? f.getRating() : 5;
                        sum += r;
                        if (r == 5) fiveStar++;
                        else if (r == 4) fourStar++;
                        else if (r == 3) threeStar++;
                        else if (r == 2) twoStar++;
                        else if (r == 1) oneStar++;

                        if (r >= 4) satCount++;
                    }
                    avgRating = BigDecimal.valueOf(sum / totalReviews).setScale(1, RoundingMode.HALF_UP).doubleValue();
                    satRate = BigDecimal.valueOf(((double) satCount / totalReviews) * 100).setScale(1, RoundingMode.HALF_UP).doubleValue();
                } else {
                    avgRating = 5.0;
                    satRate = 100.0;
                }

                String badge;
                if (totalReviews > 0) {
                    if (avgRating >= 4.8) badge = "Top Performer ⭐";
                    else if (avgRating >= 4.5) badge = "Customer Favorite 💙";
                    else if (avgRating >= 4.0) badge = "Reliable Support 👍";
                    else badge = "Developing 📈";
                } else {
                    badge = "Ready for Reviews 🌟";
                }

                scorecards.add(AgentScorecardDto.builder()
                        .agentId(agent.getId())
                        .agentName(agent.getName() != null ? agent.getName() : "Support Agent")
                        .agentEmail(agent.getEmail())
                        .department(agent.getDepartment())
                        .totalRatings(totalReviews)
                        .averageRating(avgRating)
                        .satisfactionRatePercentage(satRate)
                        .fiveStarCount(fiveStar)
                        .fourStarCount(fourStar)
                        .threeStarCount(threeStar)
                        .twoStarCount(twoStar)
                        .oneStarCount(oneStar)
                        .badge(badge)
                        .build());
            }

            for (Map.Entry<Long, List<Feedback>> entry : feedbacksByAgent.entrySet()) {
                boolean alreadyIncluded = scorecards.stream().anyMatch(sc -> sc.getAgentId().equals(entry.getKey()));
                if (!alreadyIncluded && !entry.getValue().isEmpty()) {
                    Feedback sample = entry.getValue().get(0);
                    User a = sample.getAgent();
                    if (a != null) {
                        long totalReviews = entry.getValue().size();
                        double sum = entry.getValue().stream().mapToInt(f -> f.getRating() != null ? f.getRating() : 5).sum();
                        double avgRating = BigDecimal.valueOf(sum / totalReviews).setScale(1, RoundingMode.HALF_UP).doubleValue();
                        long satCount = entry.getValue().stream().filter(f -> f.getRating() != null && f.getRating() >= 4).count();
                        double satRate = BigDecimal.valueOf(((double) satCount / totalReviews) * 100).setScale(1, RoundingMode.HALF_UP).doubleValue();

                        scorecards.add(AgentScorecardDto.builder()
                                .agentId(a.getId())
                                .agentName(a.getName() != null ? a.getName() : "Support Agent")
                                .agentEmail(a.getEmail())
                                .department(a.getDepartment())
                                .totalRatings(totalReviews)
                                .averageRating(avgRating)
                                .satisfactionRatePercentage(satRate)
                                .badge("Active Resolver ⭐")
                                .build());
                    }
                }
            }

            scorecards.sort((a, b) -> {
                int comp = Long.compare(b.getTotalRatings(), a.getTotalRatings());
                if (comp != 0) return comp;
                return Double.compare(b.getAverageRating(), a.getAverageRating());
            });

            return scorecards;
        } catch (Exception e) {
            log.error("Error building agent scorecards: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private FeedbackResponse mapToResponse(Feedback f) {
        return FeedbackResponse.builder()
                .id(f.getId())
                .ticketId(f.getTicket() != null ? f.getTicket().getId() : null)
                .ticketNumber(f.getTicket() != null ? f.getTicket().getTicketNumber() : null)
                .ticketSubject(f.getTicket() != null ? f.getTicket().getSubject() : null)
                .companyId(f.getCompany() != null ? f.getCompany().getId() : null)
                .companyName(f.getCompany() != null ? f.getCompany().getCompanyName() : null)
                .customerId(f.getCustomer() != null ? f.getCustomer().getId() : null)
                .customerName(f.getCustomerName() != null ? f.getCustomerName() : (f.getCustomer() != null ? f.getCustomer().getName() : "Customer"))
                .customerEmail(f.getCustomerEmail() != null ? f.getCustomerEmail() : (f.getCustomer() != null ? f.getCustomer().getEmail() : null))
                .agentId(f.getAgent() != null ? f.getAgent().getId() : null)
                .agentName(f.getAgent() != null ? f.getAgent().getName() : "Support Agent")
                .rating(f.getRating())
                .feedback(f.getFeedback())
                .tags(f.getTags())
                .createdAt(f.getCreatedAt())
                .build();
    }
}
