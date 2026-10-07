package com.ticketpro.api.service;

import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired(required = false)
    private FeedbackService feedbackService;

    @Value("${ticketpro.mail.from:TicketPro Support <support@ticketpro.com>}")
    private String mailFrom;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${ticketpro.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${ticketpro.backend.url:http://localhost:8081}")
    private String backendUrl;

    @Async("emailTaskExecutor")
    public void sendEmail(String to, String subject, String bodyHtml) {
        sendHtmlEmail(to, subject, bodyHtml);
    }

    private void applySenderAddress(MimeMessageHelper helper) throws MessagingException, UnsupportedEncodingException {
        String from = (mailFrom != null && !mailFrom.trim().isEmpty()) ? mailFrom.trim() : "";
        String username = (mailUsername != null && !mailUsername.trim().isEmpty()) ? mailUsername.trim() : "";

        if (from.contains("<") && from.contains(">")) {
            helper.setFrom(from);
        } else if (from.contains("@")) {
            helper.setFrom(from, "TicketPro Helpdesk");
        } else if (!username.isEmpty() && username.contains("@")) {
            String personalName = !from.isEmpty() ? from : "TicketPro Smart ticket Better Support";
            helper.setFrom(username, personalName);
        } else if (!from.isEmpty()) {
            helper.setFrom(from);
        } else {
            helper.setFrom("support@ticketpro.com", "Ticket Pro Smart ticket Better Support");
        }
    }

    public boolean sendHtmlEmail(String to, String subject, String bodyHtml) {
        if (mailSender == null) {
            log.debug("JavaMailSender is null. Email notification skipped.");
            return false;
        }

        if (to == null || to.trim().isEmpty()) {
            return false;
        }

        String lowerTo = to.trim().toLowerCase();
        if (lowerTo.endsWith("@example.com") || lowerTo.endsWith("@test.com") || lowerTo.endsWith(".local")) {
            log.debug("Skipped dummy/internal domain email: {}", to);
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            applySenderAddress(helper);
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(bodyHtml, true);

            mailSender.send(message);
            log.info("Email delivered successfully to: {}", to);
            return true;
        } catch (Exception e) {
            log.error("Failed to deliver physical email via SMTP to {}: {}", to, e.getMessage(), e);
            return false;
        }
    }

    // =========================================================================
    // 1. WORKSPACE APPROVAL EMAIL
    // =========================================================================
    @Async("emailTaskExecutor")
    public void sendCompanyApprovedEmail(Company company, String initialAdminEmail, String adminName) {
        sendCompanyApprovalEmail(company, initialAdminEmail);
    }

    @Async("emailTaskExecutor")
    public void sendCompanyApprovalEmail(Company company, String initialAdminEmail) {
        String companyName = company.getCompanyName();
        String subject = "✓ Workspace Approved: Welcome to " + companyName + " Helpdesk";

        Map<String, String> details = new LinkedHashMap<>();
        details.put("Company Name", companyName);
        details.put("Workspace Code", "<code>" + company.getCompanyCode() + "</code>");
        details.put("Admin Account", initialAdminEmail);
        details.put("Status", "<span style=\"color:#059669; font-weight:800;\">&#9679; ACTIVE & PROVISIONED</span>");

        String html = buildEnterpriseEmailHtml(
                "WORKSPACE ACTIVATED",
                "#059669",
                companyName,
                "Welcome to TicketPro Enterprise Helpdesk",
                "Dear " + companyName + " Administrator,",
                "Your enterprise workspace has been verified, approved, and provisioned by the Super Administrator. You can now invite staff, configure SLA policies, and manage service requests in real time.",
                details,
                null,
                "Login to Workspace Portal",
                frontendUrl + "/login",
                "Access your portal anytime to monitor incoming tickets, customer CSAT, and SLAs."
        );

        sendHtmlEmail(initialAdminEmail, subject, html);
    }

    // =========================================================================
    // 2. WORKSPACE REJECTION EMAIL
    // =========================================================================
    @Async("emailTaskExecutor")
    public void sendCompanyRejectionEmail(Company company, String adminEmail, String reason) {
        String companyName = company.getCompanyName();
        String subject = "Update: TicketPro Registration for " + companyName;

        Map<String, String> details = new LinkedHashMap<>();
        details.put("Company Name", companyName);
        details.put("Workspace Code", company.getCompanyCode());
        details.put("Review Decision", "<span style=\"color:#dc2626; font-weight:800;\">&#9679; REGISTRATION DECLINED</span>");
        details.put("Reason / Feedback", reason != null ? reason : "Standard compliance or verification criteria not met.");

        String html = buildEnterpriseEmailHtml(
                "REGISTRATION UPDATE",
                "#dc2626",
                companyName,
                "Workspace Application Status",
                "Dear " + companyName + " Representative,",
                "Thank you for your interest in TicketPro. After reviewing your organization registration application, we regret to inform you that we cannot activate your workspace at this time.",
                details,
                null,
                "Contact Platform Support",
                frontendUrl + "/login",
                "If you believe this determination was made in error or wish to update documentation, please contact our support desk."
        );

        sendHtmlEmail(adminEmail, subject, html);
    }

    // =========================================================================
    // 3. TICKET CREATED NOTIFICATIONS
    // =========================================================================
    @Async("emailTaskExecutor")
    public void sendTicketCreatedNotifications(Ticket ticket, Company company, User creator, User assignedAgent, List<User> companyAdmins) {
        String ticketSubject = ticket.getSubject();
        String ticketNumber = ticket.getTicketNumber();
        String creatorName = creator != null ? creator.getName() : "Customer";
        String companyName = company != null ? company.getCompanyName() : "TicketPro";

        // (A) Email to Creator / Customer
        if (creator != null && creator.getEmail() != null) {
            String subject = "Ticket Received [" + ticketNumber + "]: " + ticketSubject;

            Map<String, String> details = new LinkedHashMap<>();
            details.put("Ticket Reference", "<strong>" + ticketNumber + "</strong>");
            details.put("Subject", ticketSubject);
            details.put("Priority", formatPriorityBadge(ticket.getPriority().name()));
            details.put("Status", "<span style=\"color:#2563eb; font-weight:800;\">&#9679; OPEN & QUEUED</span>");
            if (ticket.getCategory() != null) {
                details.put("Category", ticket.getCategory().getName());
            }

            String html = buildEnterpriseEmailHtml(
                    "TICKET CONFIRMATION",
                    "#4f46e5",
                    companyName,
                    "We've Received Your Support Request",
                    "Hi " + creatorName + ",",
                    "Your ticket has been logged in our system and routed to our dedicated service desk. Our specialists are reviewing your inquiry and will follow up shortly.",
                    details,
                    null,
                    "Track Ticket in Portal",
                    frontendUrl + "/tickets/" + ticket.getId(),
                    "You will receive an instant email notification whenever an agent replies or updates your ticket."
            );
            sendHtmlEmail(creator.getEmail(), subject, html);
        }

        // (B) Email to Assigned Agent
        if (assignedAgent != null && assignedAgent.getEmail() != null) {
            String subject = "New Assignment: " + ticketNumber + " - " + ticketSubject;

            Map<String, String> details = new LinkedHashMap<>();
            details.put("Ticket Reference", "<strong>" + ticketNumber + "</strong>");
            details.put("Raised By", creatorName + (creator != null && creator.getEmail() != null ? " (" + creator.getEmail() + ")" : ""));
            details.put("Subject", ticketSubject);
            details.put("Priority", formatPriorityBadge(ticket.getPriority().name()));
            if (ticket.getDepartment() != null) {
                details.put("Department", ticket.getDepartment());
            }

            String html = buildEnterpriseEmailHtml(
                    "ASSIGNMENT NOTIFICATION",
                    "#059669",
                    companyName,
                    "New Support Ticket Assigned to You",
                    "Hi " + assignedAgent.getName() + ",",
                    "A new support request in " + companyName + " has been assigned to you. Please review the ticket details and initiate resolution within SLA targets.",
                    details,
                    null,
                    "Open & Resolve Ticket",
                    frontendUrl + "/tickets/" + ticket.getId(),
                    "Timely resolution contributes directly to customer satisfaction and SLA performance metrics."
            );
            sendHtmlEmail(assignedAgent.getEmail(), subject, html);
        }

        // (C) Alert to Company Admins (if unassigned)
        if (assignedAgent == null && companyAdmins != null) {
            for (User admin : companyAdmins) {
                if (admin.getEmail() != null && (creator == null || !admin.getEmail().equalsIgnoreCase(creator.getEmail()))) {
                    String subject = "⚠️ Unassigned Ticket Alert: " + ticketNumber + " (" + ticket.getPriority() + ")";

                    Map<String, String> details = new LinkedHashMap<>();
                    details.put("Ticket Reference", "<strong>" + ticketNumber + "</strong>");
                    details.put("Customer", creatorName);
                    details.put("Subject", ticketSubject);
                    details.put("Priority", formatPriorityBadge(ticket.getPriority().name()));
                    details.put("Assignment", "<span style=\"color:#d97706; font-weight:800;\">&#9888; UNASSIGNED</span>");

                    String html = buildEnterpriseEmailHtml(
                            "DISPATCH ALERT",
                            "#d97706",
                            companyName,
                            "New Unassigned Ticket Requires Attention",
                            "Hi " + admin.getName() + ",",
                            "A new support ticket has been submitted and is currently unassigned in the queue. Please assign a specialist agent to maintain SLA response standards.",
                            details,
                            null,
                            "Assign Ticket in Portal",
                            frontendUrl + "/tickets/" + ticket.getId(),
                            "Automated triage reminder from TicketPro Service Queue."
                    );
                    sendHtmlEmail(admin.getEmail(), subject, html);
                }
            }
        }
    }

    // =========================================================================
    // 4. TICKET STATUS UPDATE NOTIFICATION (INCLUDES 1-CLICK RATING IF RESOLVED)
    // =========================================================================
    @Async("emailTaskExecutor")
    public void sendTicketStatusUpdateNotification(Ticket ticket, Company company, User creator, User assignedAgent, String oldStatus, String newStatus) {
        String ticketNumber = ticket.getTicketNumber();
        String ticketSubject = ticket.getSubject();
        String companyName = company != null ? company.getCompanyName() : "TicketPro";

        if (creator != null && creator.getEmail() != null) {
            boolean isResolvedOrClosed = "RESOLVED".equalsIgnoreCase(newStatus) || "CLOSED".equalsIgnoreCase(newStatus);
            String subject = (isResolvedOrClosed ? "✓ Resolved: " : "Status Update [" + newStatus + "]: ") + "Ticket " + ticketNumber;

            Map<String, String> details = new LinkedHashMap<>();
            details.put("Ticket Reference", "<strong>" + ticketNumber + "</strong>");
            details.put("Subject", ticketSubject);
            details.put("Previous Status", "<span style=\"color:#64748b;\">" + oldStatus + "</span>");
            details.put("New Status", formatStatusBadge(newStatus));
            if (assignedAgent != null) {
                details.put("Assigned Specialist", assignedAgent.getName());
            }

            // If ticket is resolved/closed, include the interactive 1-click rating block right here!
            String ratingBlock = null;
            if (isResolvedOrClosed && feedbackService != null) {
                String token = feedbackService.generateRatingToken(ticket.getId(), creator.getEmail());
                ratingBlock = buildInteractiveRatingBlock(ticket.getId(), ticketNumber, token);
            }

            String leadText = isResolvedOrClosed
                    ? "Great news! Your support ticket has been marked as resolved by our service team. Please review the resolution and let us know how we did below."
                    : "The status of your ticket has been updated from " + oldStatus + " to " + newStatus + ".";

            String html = buildEnterpriseEmailHtml(
                    isResolvedOrClosed ? "TICKET RESOLVED" : "STATUS UPDATE",
                    isResolvedOrClosed ? "#059669" : "#4f46e5",
                    companyName,
                    isResolvedOrClosed ? "Your Support Request is Resolved" : "Ticket Status Updated",
                    "Hi " + creator.getName() + ",",
                    leadText,
                    details,
                    ratingBlock,
                    "View Ticket in Portal",
                    frontendUrl + "/tickets/" + ticket.getId(),
                    "Have additional questions or need to reopen? Visit the ticket portal or reply directly."
            );
            sendHtmlEmail(creator.getEmail(), subject, html);
        }
    }

    // =========================================================================
    // 5. CSAT SURVEY EMAIL WITH 1-CLICK INSTANT RATING & REAL-TIME SYNC
    // =========================================================================
    @Async("emailTaskExecutor")
    public void sendCsatSurveyEmail(Ticket ticket, Company company, User creator, User assignedAgent) {
        if (creator == null || creator.getEmail() == null) return;

        String ticketNumber = ticket.getTicketNumber();
        String ticketSubject = ticket.getSubject();
        String companyName = company != null ? company.getCompanyName() : "TicketPro";
        String agentName = assignedAgent != null ? assignedAgent.getName() : "our support team";

        String subject = "🌟 How was our support on ticket " + ticketNumber + "?";

        Map<String, String> details = new LinkedHashMap<>();
        details.put("Ticket Reference", "<strong>" + ticketNumber + "</strong>");
        details.put("Subject", ticketSubject);
        details.put("Assisted By", agentName);
        details.put("Resolution Status", "<span style=\"color:#059669; font-weight:800;\">&#9679; RESOLVED</span>");

        String token = (feedbackService != null)
                ? feedbackService.generateRatingToken(ticket.getId(), creator.getEmail())
                : null;
        String ratingBlock = (token != null) ? buildInteractiveRatingBlock(ticket.getId(), ticketNumber, token) : null;

        String html = buildEnterpriseEmailHtml(
                "CUSTOMER SATISFACTION SURVEY",
                "#4f46e5",
                companyName,
                "Your Feedback Matters &bull; 1-Click Rating",
                "Hi " + creator.getName() + ",",
                "Your ticket <strong>" + ticketNumber + "</strong> (<em>\"" + ticketSubject + "\"</em>) was recently resolved by <strong>" + agentName + "</strong> in " + companyName + ". We would love to know how we did &mdash; it takes just 5 seconds!",
                details,
                ratingBlock,
                "View Ticket & Audit Log",
                frontendUrl + "/tickets/" + ticket.getId(),
                "Your feedback directly helps us evaluate and celebrate our support agents."
        );

        sendHtmlEmail(creator.getEmail(), subject, html);
    }

    // =========================================================================
    // 6. TICKET ASSIGNED TO AGENT
    // =========================================================================
    @Async("emailTaskExecutor")
    public void sendTicketAssignedEmail(Ticket ticket, Company company, User newAgent, User assignedBy) {
        if (newAgent == null || newAgent.getEmail() == null) return;

        String ticketNumber = ticket.getTicketNumber();
        String ticketSubject = ticket.getSubject();
        String companyName = company != null ? company.getCompanyName() : "TicketPro";
        String assignedByName = assignedBy != null ? assignedBy.getName() : "System Administrator";

        String subject = "Assignment: Ticket " + ticketNumber + " - " + ticketSubject;

        Map<String, String> details = new LinkedHashMap<>();
        details.put("Ticket Reference", "<strong>" + ticketNumber + "</strong>");
        details.put("Assigned By", assignedByName);
        details.put("Subject", ticketSubject);
        details.put("Priority", formatPriorityBadge(ticket.getPriority().name()));
        details.put("Status", formatStatusBadge(ticket.getStatus().name()));

        String html = buildEnterpriseEmailHtml(
                "AGENT REASSIGNMENT",
                "#4f46e5",
                companyName,
                "Ticket Assigned to Your Workspace Queue",
                "Hi " + newAgent.getName() + ",",
                "You have been assigned to handle and resolve ticket <strong>" + ticketNumber + "</strong> by " + assignedByName + ".",
                details,
                null,
                "Open & Resolve Ticket",
                frontendUrl + "/tickets/" + ticket.getId(),
                "Please review the conversation history and customer notes before responding."
        );

        sendHtmlEmail(newAgent.getEmail(), subject, html);
    }

    // =========================================================================
    // 7. PUBLIC COMMENT EMAIL NOTIFICATION
    // =========================================================================
    @Async("emailTaskExecutor")
    public void sendPublicCommentEmail(Ticket ticket, Company company, User sender, User recipient, String commentText) {
        if (recipient == null || recipient.getEmail() == null) return;

        String ticketNumber = ticket.getTicketNumber();
        String ticketSubject = ticket.getSubject();
        String companyName = company != null ? company.getCompanyName() : "TicketPro";
        String senderName = sender != null ? sender.getName() : "Support Agent";

        String subject = "New Response: Ticket " + ticketNumber + " - " + ticketSubject;

        Map<String, String> details = new LinkedHashMap<>();
        details.put("Ticket Reference", "<strong>" + ticketNumber + "</strong>");
        details.put("Subject", ticketSubject);
        details.put("Latest Reply From", "<strong>" + senderName + "</strong>");

        // Format quoted comment box
        String formattedComment = commentText != null ? commentText.replace("\n", "<br/>") : "";
        String commentBoxHtml = """
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-left: 5px solid #4f46e5; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 14px; color: #1e293b; line-height: 1.6;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px;">Response Message:</div>
                    %s
                </div>
                """.formatted(formattedComment);

        String html = buildEnterpriseEmailHtml(
                "NEW CONVERSATION REPLY",
                "#4f46e5",
                companyName,
                "New Response Added to Ticket " + ticketNumber,
                "Hi " + recipient.getName() + ",",
                "<strong>" + senderName + "</strong> has posted a response to your support inquiry:",
                details,
                commentBoxHtml,
                "Reply to Ticket in Portal",
                frontendUrl + "/tickets/" + ticket.getId(),
                "You can view complete thread attachments and reply directly in the web portal."
        );

        sendHtmlEmail(recipient.getEmail(), subject, html);
    }

    // =========================================================================
    // 8. SLA BREACH ALERT
    // =========================================================================
    @Async("emailTaskExecutor")
    public void sendSlaBreachAlert(Ticket ticket, Company company, User assignedAgent, List<User> companyAdmins) {
        String ticketNumber = ticket.getTicketNumber();
        String ticketSubject = ticket.getSubject();
        String companyName = company != null ? company.getCompanyName() : "TicketPro";

        // (A) Alert Assigned Agent
        if (assignedAgent != null && assignedAgent.getEmail() != null) {
            String subject = "🚨 SLA BREACH ALERT: Ticket " + ticketNumber;

            Map<String, String> details = new LinkedHashMap<>();
            details.put("Ticket Reference", "<strong>" + ticketNumber + "</strong>");
            details.put("Subject", ticketSubject);
            details.put("Current Priority", formatPriorityBadge(ticket.getPriority().name()));
            details.put("SLA State", "<span style=\"color:#dc2626; font-weight:800;\">&#9888; BREACHED RESOLUTION TARGET</span>");

            String html = buildEnterpriseEmailHtml(
                    "URGENT SLA ESCALATION",
                    "#dc2626",
                    companyName,
                    "Urgent: SLA Resolution Deadline Exceeded",
                    "Hi " + assignedAgent.getName() + ",",
                    "Ticket <strong>" + ticketNumber + "</strong> assigned to you has surpassed its target SLA resolution deadline and has been automatically escalated.",
                    details,
                    null,
                    "Expedite Ticket Resolution",
                    frontendUrl + "/tickets/" + ticket.getId(),
                    "Immediate response is required to prevent customer dissatisfaction and contract penalties."
            );
            sendHtmlEmail(assignedAgent.getEmail(), subject, html);
        }

        // (B) Alert Company Admins
        if (companyAdmins != null) {
            for (User admin : companyAdmins) {
                if (admin.getEmail() != null) {
                    String subject = "🚨 Executive SLA Escalation: Ticket " + ticketNumber;

                    Map<String, String> details = new LinkedHashMap<>();
                    details.put("Ticket Reference", "<strong>" + ticketNumber + "</strong>");
                    details.put("Company Workspace", companyName);
                    details.put("Subject", ticketSubject);
                    details.put("Assigned Specialist", assignedAgent != null ? assignedAgent.getName() : "Unassigned");
                    details.put("Escalation Tier", "<span style=\"color:#dc2626; font-weight:800;\">&#9888; MANAGEMENT ESCALATION</span>");

                    String html = buildEnterpriseEmailHtml(
                            "EXECUTIVE SLA ALERT",
                            "#dc2626",
                            companyName,
                            "Service Level Agreement Breach Notification",
                            "Hi " + admin.getName() + ",",
                            "A support ticket in workspace <strong>" + companyName + "</strong> has violated its SLA resolution deadline without closure.",
                            details,
                            null,
                            "View & Intervene in Portal",
                            frontendUrl + "/tickets/" + ticket.getId(),
                            "This notification was automatically dispatched per your company's SLA policy rules."
                    );
                    sendHtmlEmail(admin.getEmail(), subject, html);
                }
            }
        }
    }

    // =========================================================================
    // 9. PASSWORD RESET OTP EMAIL
    // =========================================================================
    @Async("emailTaskExecutor")
    public void sendPasswordResetOtpEmail(String recipientEmail, String userName, String otp, int expiryMinutes) {
        if (recipientEmail == null || recipientEmail.trim().isEmpty()) return;

        String name = (userName != null && !userName.trim().isEmpty()) ? userName.trim() : "TicketPro User";
        String subject = "🔑 Password Reset Code: " + otp;

        String otpBlockHtml = """
                <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 26px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #4338ca; font-family: monospace; display: block;">%s</span>
                    <p style="margin: 12px 0 0 0; font-size: 12px; font-weight: 700; color: #dc2626;">
                        &#9201; Expires in %d minutes
                    </p>
                </div>
                """.formatted(otp, expiryMinutes);

        Map<String, String> details = new LinkedHashMap<>();
        details.put("Account Email", recipientEmail);
        details.put("Verification Target", "Password Reset Authentication");
        details.put("Validity Window", expiryMinutes + " Minutes");

        String html = buildEnterpriseEmailHtml(
                "SECURITY VERIFICATION",
                "#4f46e5",
                "TicketPro Security",
                "Password Reset Authorization",
                "Hello " + name + ",",
                "We received a request to reset your TicketPro account credentials. Enter the single-use 6-digit authentication code below to proceed:",
                details,
                otpBlockHtml,
                "Enter Verification Code",
                frontendUrl + "/login",
                "If you did not request this security code, your account remains secure & you may disregard this message."
        );

        sendHtmlEmail(recipientEmail, subject, html);
    }

    // =========================================================================
    // REUSABLE 1-CLICK CSAT RATING COMPONENT BUILDER
    // =========================================================================
    public String buildInteractiveRatingBlock(Long ticketId, String ticketNumber, String token) {
        String tokenParam = (token != null && !token.isBlank()) ? "&token=" + token : "";
        String rate1Url = backendUrl + "/api/public/feedback/rate?ticketId=" + ticketId + "&rating=1" + tokenParam;
        String rate2Url = backendUrl + "/api/public/feedback/rate?ticketId=" + ticketId + "&rating=2" + tokenParam;
        String rate3Url = backendUrl + "/api/public/feedback/rate?ticketId=" + ticketId + "&rating=3" + tokenParam;
        String rate4Url = backendUrl + "/api/public/feedback/rate?ticketId=" + ticketId + "&rating=4" + tokenParam;
        String rate5Url = backendUrl + "/api/public/feedback/rate?ticketId=" + ticketId + "&rating=5" + tokenParam;

        return """
            <div style="background: linear-gradient(180deg, #ffffff 0%%, #f8fafc 100%%); border: 2px solid #e0e7ff; border-radius: 18px; padding: 26px 20px; text-align: center; margin: 26px 0; box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.08);">
                <div style="display: inline-block; background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; padding: 4px 12px; border-radius: 100px; margin-bottom: 10px;">
                    &#11088; 1-Click Instant Customer Rating
                </div>
                <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">How was your overall support experience?</h3>
                <p style="font-size: 13px; color: #64748b; margin: 0 0 20px 0;">
                    Click a rating button below to submit your rating directly & update our live dashboard in real time:
                </p>

                <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 100%%; max-width: 520px;">
                    <tr>
                        <td align="center" style="padding: 4px; width: 20%%;">
                            <a href="%s" target="_blank" style="display: block; padding: 12px 6px; background-color: #fef2f2; border: 1.5px solid #fecaca; color: #991b1b; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 12px; text-align: center; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.05);">
                                <div style="font-size: 20px; margin-bottom: 4px;">&#128542;</div>
                                <span>1 - Poor</span>
                            </a>
                        </td>
                        <td align="center" style="padding: 4px; width: 20%%;">
                            <a href="%s" target="_blank" style="display: block; padding: 12px 6px; background-color: #fff7ed; border: 1.5px solid #fed7aa; color: #9a3412; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 12px; text-align: center; box-shadow: 0 2px 4px rgba(234, 88, 12, 0.05);">
                                <div style="font-size: 20px; margin-bottom: 4px;">&#128577;</div>
                                <span>2 - Fair</span>
                            </a>
                        </td>
                        <td align="center" style="padding: 4px; width: 20%%;">
                            <a href="%s" target="_blank" style="display: block; padding: 12px 6px; background-color: #fefce8; border: 1.5px solid #fef08a; color: #854d0e; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 12px; text-align: center; box-shadow: 0 2px 4px rgba(202, 138, 4, 0.05);">
                                <div style="font-size: 20px; margin-bottom: 4px;">&#128528;</div>
                                <span>3 - Good</span>
                            </a>
                        </td>
                        <td align="center" style="padding: 4px; width: 20%%;">
                            <a href="%s" target="_blank" style="display: block; padding: 12px 6px; background-color: #eff6ff; border: 1.5px solid #bfdbfe; color: #1e40af; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 12px; text-align: center; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.05);">
                                <div style="font-size: 20px; margin-bottom: 4px;">&#128522;</div>
                                <span>4 - Great</span>
                            </a>
                        </td>
                        <td align="center" style="padding: 4px; width: 20%%;">
                            <a href="%s" target="_blank" style="display: block; padding: 12px 6px; background-color: #ecfdf5; border: 1.5px solid #a7f3d0; color: #065f46; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 12px; text-align: center; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.05);">
                                <div style="font-size: 20px; margin-bottom: 4px;">&#127775;</div>
                                <span>5 - Great!</span>
                            </a>
                        </td>
                    </tr>
                </table>
                <p style="font-size: 11px; font-weight: 600; color: #94a3b8; margin: 16px 0 0 0;">
                    &#10003; No login or password required &bull; 1 click records your rating and notifies your support team instantly
                </p>
            </div>
            """.formatted(rate1Url, rate2Url, rate3Url, rate4Url, rate5Url);
    }

    // =========================================================================
    // STANDARD ENTERPRISE EMAIL TEMPLATE BUILDER
    // =========================================================================
    private String buildEnterpriseEmailHtml(
            String badgeText,
            String accentColor,
            String companyName,
            String title,
            String greeting,
            String leadText,
            Map<String, String> keyValues,
            String customHtmlBlock,
            String ctaText,
            String ctaUrl,
            String footerNote
    ) {
        StringBuilder kvRows = new StringBuilder();
        if (keyValues != null && !keyValues.isEmpty()) {
            for (Map.Entry<String, String> entry : keyValues.entrySet()) {
                kvRows.append("""
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
                        <span style="color: #64748b; font-weight: 600;">%s</span>
                        <span style="color: #0f172a; font-weight: 700; text-align: right;">%s</span>
                    </div>
                    """.formatted(entry.getKey(), entry.getValue()));
            }
        }

        String ctaButtonHtml = "";
        if (ctaText != null && ctaUrl != null) {
            ctaButtonHtml = """
                <div style="text-align: center; margin: 28px 0 10px 0;">
                    <a href="%s" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%%, #4338ca 100%%); color: #ffffff; padding: 13px 28px; border-radius: 12px; font-size: 13px; font-weight: 800; text-decoration: none; letter-spacing: 0.2px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                        %s &rarr;
                    </a>
                </div>
                """.formatted(ctaUrl, ctaText);
        }

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #0f172a; }
                    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.06); }
                    .header { background: linear-gradient(135deg, #1e1b4b 0%%, #312e81 40%%, #4338ca 100%%); padding: 26px 32px; color: #ffffff; text-align: left; }
                    .header-top { display: flex; align-items: center; justify-content: space-between; }
                    .badge { display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #ffffff; padding: 4px 10px; border-radius: 100px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                    .tenant-tag { font-size: 11px; font-weight: 700; color: #c7d2fe; text-transform: uppercase; letter-spacing: 0.5px; }
                    .header h1 { font-size: 20px; font-weight: 900; margin: 12px 0 0 0; color: #ffffff; letter-spacing: -0.3px; }
                    .body { padding: 32px; text-align: left; }
                    .greeting { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
                    .lead { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
                    .meta-card { background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; padding: 18px 20px; margin-bottom: 20px; }
                    .meta-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 8px; }
                    .footer { background: #f8fafc; padding: 22px 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <table width="100%%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                                <td align="left">
                                    <span class="badge">%s</span>
                                </td>
                                <td align="right">
                                    <span class="tenant-tag">%s HELP DESK</span>
                                </td>
                            </tr>
                        </table>
                        <h1>%s</h1>
                    </div>

                    <div class="body">
                        <div class="greeting">%s</div>
                        <div class="lead">%s</div>

                        %s

                        %s

                        %s

                        %s
                    </div>

                    <div class="footer">
                        <p style="margin: 0; font-weight: 700; color: #64748b;">
                            TicketPro Cloud Helpdesk Platform &bull; Workspace: %s
                        </p>
                        <p style="margin: 6px 0 0 0;">
                            %s
                        </p>
                        <p style="margin: 6px 0 0 0; font-size: 10px; color: #cbd5e1;">
                            Automated notification &bull; Please do not reply with passwords or sensitive authentication credentials.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                title,
                badgeText,
                companyName,
                title,
                greeting,
                leadText,
                (kvRows.length() > 0) ? """
                    <div class="meta-card">
                        <div class="meta-title">Ticket & Workspace Information</div>
                        %s
                    </div>
                """.formatted(kvRows.toString()) : "",
                (customHtmlBlock != null ? customHtmlBlock : ""),
                ctaButtonHtml,
                (footerNote != null ? "<p style=\"font-size: 12px; color: #64748b; margin-top: 20px; line-height: 1.5;\">" + footerNote + "</p>" : ""),
                companyName,
                (footerNote != null ? footerNote : "All ticket activity is synchronized in real time.")
        );
    }

    private String formatStatusBadge(String status) {
        if (status == null) status = "OPEN";
        String color = switch (status.toUpperCase()) {
            case "RESOLVED" -> "#059669";
            case "CLOSED" -> "#475569";
            case "IN_PROGRESS" -> "#d97706";
            case "ON_HOLD" -> "#7c3aed";
            default -> "#2563eb";
        };
        return "<span style=\"color:" + color + "; font-weight:800;\">&#9679; " + status.toUpperCase() + "</span>";
    }

    private String formatPriorityBadge(String priority) {
        if (priority == null) priority = "MEDIUM";
        String color = switch (priority.toUpperCase()) {
            case "CRITICAL" -> "#dc2626";
            case "HIGH" -> "#ea580c";
            case "MEDIUM" -> "#d97706";
            default -> "#059669";
        };
        return "<span style=\"color:" + color + "; font-weight:800;\">&#9679; " + priority.toUpperCase() + "</span>";
    }
}
