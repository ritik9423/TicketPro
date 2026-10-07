package com.ticketpro.api.service;

import com.ticketpro.api.dto.CommentRequest;
import com.ticketpro.api.dto.InboundEmailRequest;
import com.ticketpro.api.dto.InboundEmailResponse;
import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class InboundEmailService {

    private final TicketRepository ticketRepository;
    private final TicketService ticketService;
    private final CommentService commentService;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;

    // Matches ticket numbers like #TK-IOCL-1234, #IOCL-12345-6789, #IOCL-1001, [IOCL-123], #12345
    private static final Pattern TICKET_NUMBER_PATTERN = Pattern.compile("(?i)(#[A-Z0-9]+(-[A-Z0-9]+)+|#?TK-[A-Z0-9-]+|#\\d{3,8})");

    public InboundEmailService(TicketRepository ticketRepository,
                               TicketService ticketService,
                               CommentService commentService,
                               UserRepository userRepository,
                               CompanyRepository companyRepository,
                               NotificationService notificationService,
                               PasswordEncoder passwordEncoder) {
        this.ticketRepository = ticketRepository;
        this.ticketService = ticketService;
        this.commentService = commentService;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.notificationService = notificationService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public InboundEmailResponse processInboundEmail(InboundEmailRequest request) {
        if (request == null || request.getFrom() == null || request.getFrom().trim().isEmpty()) {
            return new InboundEmailResponse(false, "REJECTED", null, null, "Missing sender email ('from').");
        }

        String rawFrom = request.getFrom().trim();
        String senderEmail = extractCleanEmail(rawFrom);
        String senderName = request.getFromName() != null && !request.getFromName().isBlank()
                ? request.getFromName()
                : extractNameFromEmailAddress(rawFrom);

        String subject = request.getSubject() != null ? request.getSubject().trim() : "";
        String body = cleanBody(request);

        // 1. Check if the subject or body references an existing ticket
        String existingTicketNumber = extractTicketNumber(subject);
        if (existingTicketNumber == null) {
            existingTicketNumber = extractTicketNumber(body);
        }

        if (existingTicketNumber != null) {
            Optional<Ticket> ticketOpt = ticketRepository.findByTicketNumber(existingTicketNumber);
            if (ticketOpt.isPresent()) {
                Ticket ticket = ticketOpt.get();
                return appendCommentToTicket(ticket, senderEmail, senderName, body, subject);
            }
        }

        // 2. Otherwise create a brand new ticket
        return createNewTicketFromEmail(senderEmail, senderName, subject, body, request.getTo());
    }

    private InboundEmailResponse appendCommentToTicket(Ticket ticket, String senderEmail, String senderName, String body, String subject) {
        User author = getOrCreateUser(senderEmail, senderName, ticket.getCompany());

        CommentRequest commentRequest = new CommentRequest();
        commentRequest.setContent("📨 [Inbound Email from " + senderName + " (" + senderEmail + ")]\n\n" + body);
        commentRequest.setInternal(false);

        commentService.addComment(
                ticket.getId(),
                commentRequest,
                author.getCompany() != null ? author.getCompany().getId() : null,
                author.getRole(),
                author
        );

        // Re-open if resolved or closed
        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
            ticketRepository.save(ticket);
        }

        String tenantCode = ticket.getCompany() != null ? ticket.getCompany().getCompanyCode() : "GLOBAL";
        notificationService.saveNotification(
                ticket.getCompany() != null ? ticket.getCompany().getEmail() : null,
                "💬 Inbound Reply on Ticket #" + ticket.getTicketNumber(),
                "New reply via email from " + senderName + ": " + (subject.length() > 60 ? subject.substring(0, 60) + "..." : subject),
                "COMMENT_ADDED",
                tenantCode,
                "ALL",
                "/tickets/" + ticket.getId()
        );

        return new InboundEmailResponse(true, "COMMENT_ADDED", ticket.getId(), ticket.getTicketNumber(),
                "Successfully appended email as comment to ticket #" + ticket.getTicketNumber());
    }

    private InboundEmailResponse createNewTicketFromEmail(String senderEmail, String senderName, String subject, String body, String toAddress) {
        Company company = resolveCompanyForInbound(senderEmail, toAddress);
        if (company == null) {
            // Fallback to primary / first active company
            List<Company> all = companyRepository.findAll();
            company = all.isEmpty() ? null : all.get(0);
        }

        User creator = getOrCreateUser(senderEmail, senderName, company);

        TicketRequest ticketRequest = new TicketRequest();
        String title = cleanSubjectForNewTicket(subject);
        if (title.isBlank()) {
            title = "Inbound Support Request from " + senderEmail;
        }
        ticketRequest.setSubject(title.length() > 200 ? title.substring(0, 197) + "..." : title);
        ticketRequest.setDescription(body != null && !body.isBlank() ? body : "No message body provided in inbound email.");
        ticketRequest.setPriority(Priority.MEDIUM);

        Ticket createdTicket = ticketService.createTicket(ticketRequest, company, creator);

        String tenantCode = company != null ? company.getCompanyCode() : "GLOBAL";
        notificationService.saveNotification(
                company != null ? company.getEmail() : null,
                "🎫 New Inbound Email Ticket: #" + createdTicket.getTicketNumber(),
                "Created ticket from email sent by " + senderName + " (" + senderEmail + "): " + title,
                "TICKET_CREATED",
                tenantCode,
                "ALL",
                "/tickets/" + createdTicket.getId()
        );

        return new InboundEmailResponse(true, "TICKET_CREATED", createdTicket.getId(), createdTicket.getTicketNumber(),
                "Successfully ingested email and opened new ticket #" + createdTicket.getTicketNumber());
    }

    private User getOrCreateUser(String email, String name, Company company) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(name != null && !name.isEmpty() ? name : "Email User");
            newUser.setPassword(passwordEncoder.encode("TicketProTemp@" + System.currentTimeMillis()));
            newUser.setRole(Role.END_USER);
            newUser.setStatus(UserStatus.ACTIVE);
            newUser.setCompany(company);
            return userRepository.save(newUser);
        });
    }

    private Company resolveCompanyForInbound(String senderEmail, String toAddress) {
        // Match by 'to' address (e.g., tickets-iocl@ticketpro.com -> IOCL)
        if (toAddress != null) {
            String toClean = toAddress.toLowerCase();
            List<Company> companies = companyRepository.findAll();
            for (Company c : companies) {
                if (c.getCompanyCode() != null && toClean.contains("-" + c.getCompanyCode().toLowerCase() + "@")) {
                    return c;
                }
            }
        }

        // Match by sender email domain (e.g., user@iocl.com -> IOCL)
        if (senderEmail != null && senderEmail.contains("@")) {
            String domain = senderEmail.substring(senderEmail.indexOf('@') + 1).toLowerCase();
            List<Company> companies = companyRepository.findAll();
            for (Company c : companies) {
                if (c.getEmail() != null && c.getEmail().toLowerCase().contains(domain)) {
                    return c;
                }
            }
        }

        return null;
    }

    private String extractTicketNumber(String text) {
        if (text == null || text.isBlank()) return null;
        Matcher matcher = TICKET_NUMBER_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    private String cleanSubjectForNewTicket(String subject) {
        if (subject == null) return "Inbound Email Ticket";
        return subject.replaceAll("(?i)^(re:|fwd:|\\[.*?])\\s*", "").trim();
    }

    private String cleanBody(InboundEmailRequest request) {
        if (request.getBodyPlain() != null && !request.getBodyPlain().isBlank()) {
            return request.getBodyPlain().trim();
        }
        if (request.getBodyHtml() != null && !request.getBodyHtml().isBlank()) {
            return request.getBodyHtml()
                    .replaceAll("(?is)<(script|style).*?>.*?</\\1>", " ")
                    .replaceAll("(?s)<[^>]*>", " ")
                    .replaceAll("&nbsp;", " ")
                    .replaceAll("&amp;", "&")
                    .replaceAll("&lt;", "<")
                    .replaceAll("&gt;", ">")
                    .replaceAll("\\s+", " ")
                    .trim();
        }
        return "";
    }

    private String extractCleanEmail(String raw) {
        if (raw.contains("<") && raw.contains(">")) {
            return raw.substring(raw.indexOf('<') + 1, raw.indexOf('>')).trim().toLowerCase();
        }
        return raw.trim().toLowerCase();
    }

    private String extractNameFromEmailAddress(String raw) {
        if (raw.contains("<")) {
            String namePart = raw.substring(0, raw.indexOf('<')).replace("\"", "").trim();
            if (!namePart.isEmpty()) return namePart;
        }
        if (raw.contains("@")) {
            return raw.substring(0, raw.indexOf('@')).trim();
        }
        return raw.trim();
    }
}
