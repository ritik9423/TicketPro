package com.ticketpro.api.service;

import com.ticketpro.api.dto.CommentRequest;
import com.ticketpro.api.entity.Comment;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.CommentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final TicketService ticketService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Autowired(required = false)
    private TicketHistoryService ticketHistoryService;

    public CommentService(CommentRepository commentRepository, 
                          TicketService ticketService,
                          NotificationService notificationService,
                          EmailService emailService) {
        this.commentRepository = commentRepository;
        this.ticketService = ticketService;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    public List<Comment> getCommentsForTicket(Long ticketId, Long companyId, Role userRole, Long userId) {
        Ticket ticket;
        try {
            ticket = ticketService.getTicketById(ticketId);
        } catch (IllegalArgumentException e) {
            return List.of();
        }
        if (ticket == null) return List.of();

        // SECURITY M-8: Enforce tenant isolation — non-SUPER_ADMIN must have a valid companyId
        if (userRole != Role.SUPER_ADMIN) {
            if (companyId == null) {
                throw new SecurityException("Company context is required for ticket access.");
            }
            if (ticket.getCompany() != null && !ticket.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Unauthorized access to ticket comments.");
            }
            if (userRole == Role.END_USER && ticket.getCreatedBy() != null && userId != null && !ticket.getCreatedBy().getId().equals(userId)) {
                throw new SecurityException("Unauthorized access to ticket comments.");
            }
        }

        // End users cannot see internal comments
        if (userRole == Role.END_USER) {
            return commentRepository.findByTicketIdAndIsInternalFalseOrderByCreatedAtAsc(ticketId);
        } else {
            return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId);
        }
    }

    public org.springframework.data.domain.Page<Comment> getCommentsForTicketPaged(Long ticketId, Long companyId, Role userRole, Long userId, org.springframework.data.domain.Pageable pageable) {
        Ticket ticket;
        try {
            ticket = ticketService.getTicketById(ticketId);
        } catch (IllegalArgumentException e) {
            return org.springframework.data.domain.Page.empty(pageable);
        }
        if (ticket == null) return org.springframework.data.domain.Page.empty(pageable);

        // SECURITY M-8: Enforce tenant isolation — non-SUPER_ADMIN must have a valid companyId
        if (userRole != Role.SUPER_ADMIN) {
            if (companyId == null) {
                throw new SecurityException("Company context is required for ticket access.");
            }
            if (ticket.getCompany() != null && !ticket.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Unauthorized access to ticket comments.");
            }
            if (userRole == Role.END_USER && ticket.getCreatedBy() != null && userId != null && !ticket.getCreatedBy().getId().equals(userId)) {
                throw new SecurityException("Unauthorized access to ticket comments.");
            }
        }

        // End users cannot see internal comments
        if (userRole == Role.END_USER) {
            return commentRepository.findByTicketIdAndIsInternalFalseOrderByCreatedAtAsc(ticketId, pageable);
        } else {
            return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId, pageable);
        }
    }

    @Transactional
    public Comment addComment(Long ticketId, CommentRequest request, Long companyId, Role userRole, User user) {
        Ticket ticket = ticketService.getTicketById(ticketId);
        if (ticket == null) throw new IllegalArgumentException("Ticket not found: " + ticketId);

        // SECURITY M-8: Enforce tenant isolation — non-SUPER_ADMIN must have a valid companyId
        if (userRole != Role.SUPER_ADMIN) {
            if (companyId == null) {
                throw new SecurityException("Company context is required for ticket comment posting.");
            }
            if (ticket.getCompany() != null && !ticket.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Unauthorized comment posting.");
            }
            if (userRole == Role.END_USER && ticket.getCreatedBy() != null && user != null && !ticket.getCreatedBy().getId().equals(user.getId())) {
                throw new SecurityException("Unauthorized comment posting.");
            }
        }

        boolean isInternal = request.isInternal();
        if (userRole == Role.END_USER) {
            isInternal = false;
        }

        Comment comment = new Comment();
        comment.setTicket(ticket);
        comment.setUser(user);
        comment.setComment(request.getComment() != null ? request.getComment() : request.getContent());
        comment.setInternal(isInternal);

        Comment saved = commentRepository.save(comment);

        if (ticketHistoryService != null) {
            try {
                String commentSummary = isInternal ? "Internal note added" : "Public reply added";
                ticketHistoryService.recordChange(ticket, "COMMENT_ADDED", "comment", null, commentSummary, user);
            } catch (Exception e) {
                log.warn("Could not record comment history: {}", e.getMessage());
            }
        }

        // Broadcast comment in real-time over WebSocket if available
        if (messagingTemplate != null) {
            try {
                // SECURITY C-6: Never broadcast internal notes to the public comments topic
                if (!isInternal) {
                    messagingTemplate.convertAndSend("/topic/tickets/" + ticketId + "/comments", com.ticketpro.api.dto.CommentResponse.from(saved));
                }
            } catch (Exception ignored) {}
        }

        // Notification and Email Restriction Matrix for Comments
        try {
            String compCode = ticket.getCompany() != null ? ticket.getCompany().getCompanyCode() : "GLOBAL";
            String commentText = saved.getComment();
            String previewText = commentText != null && commentText.length() > 70 ? commentText.substring(0, 67) + "..." : (commentText != null ? commentText : "");

            if (isInternal) {
                // 1. Internal Note: STRICTLY RESTRICT FROM CUSTOMER / END_USER
                User assignedAgent = ticket.getAssignedTo();
                if (assignedAgent != null && (user == null || !assignedAgent.getId().equals(user.getId())) && assignedAgent.getEmail() != null) {
                    notificationService.saveNotification(
                            assignedAgent.getEmail(),
                            "🔒 Internal Note: " + ticket.getTicketNumber(),
                            (user != null ? user.getName() : "Team Member") + " posted an internal note: " + previewText,
                            "INTERNAL_NOTE",
                            compCode,
                            "AGENT",
                            "/tickets/" + ticket.getId()
                    );
                }
            } else {
                // 2. Public Response
                User creator = ticket.getCreatedBy();
                User assignedAgent = ticket.getAssignedTo();
                boolean isAuthorStaff = (userRole == Role.AGENT || userRole == Role.COMPANY_ADMIN || userRole == Role.SUPER_ADMIN || userRole == Role.MANAGER);

                if (isAuthorStaff) {
                    // Staff replied -> Notify Customer
                    if (creator != null && creator.getEmail() != null) {
                        notificationService.saveNotification(
                                creator.getEmail(),
                                "💬 New Reply: " + ticket.getTicketNumber(),
                                (user != null ? user.getName() : "Support Agent") + ": " + previewText,
                                "TICKET_REPLY",
                                compCode,
                                "USER",
                                "/tickets/" + ticket.getId()
                        );
                        emailService.sendPublicCommentEmail(ticket, ticket.getCompany(), user, creator, commentText);
                    }
                } else {
                    // Customer replied -> Notify Assigned Agent or Company Admins
                    if (assignedAgent != null && assignedAgent.getEmail() != null) {
                        notificationService.saveNotification(
                                assignedAgent.getEmail(),
                                "💬 Customer Response: " + ticket.getTicketNumber(),
                                (creator != null ? creator.getName() : "Customer") + ": " + previewText,
                                "TICKET_REPLY",
                                compCode,
                                "AGENT",
                                "/tickets/" + ticket.getId()
                        );
                        emailService.sendPublicCommentEmail(ticket, ticket.getCompany(), user, assignedAgent, commentText);
                    } else {
                        // Unassigned ticket -> Notify Company Admin
                        notificationService.saveNotification(
                                null,
                                "💬 Customer Response (Unassigned): " + ticket.getTicketNumber(),
                                (creator != null ? creator.getName() : "Customer") + ": " + previewText,
                                "TICKET_REPLY",
                                compCode,
                                "COMPANY_ADMIN",
                                "/tickets/" + ticket.getId()
                        );
                    }
                }
            }
        } catch (Exception e) {
            // Non-blocking notification safety
        }

        return saved;
    }
}
