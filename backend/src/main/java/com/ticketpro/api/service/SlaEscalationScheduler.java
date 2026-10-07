package com.ticketpro.api.service;

import com.ticketpro.api.entity.Priority;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.TicketStatus;
import com.ticketpro.api.repository.TicketRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
public class SlaEscalationScheduler {

    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    public SlaEscalationScheduler(TicketRepository ticketRepository, 
                                  NotificationService notificationService,
                                  EmailService emailService) {
        this.ticketRepository = ticketRepository;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    /**
     * Periodically check for unresolved tickets that have passed their SLA Resolution Deadline.
     * Runs every 60 seconds.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void evaluateSlaBreaches() {
        LocalDateTime now = LocalDateTime.now();
        List<TicketStatus> activeStatuses = Arrays.asList(TicketStatus.OPEN, TicketStatus.IN_PROGRESS);

        List<Ticket> breachedTickets = ticketRepository
                .findByStatusInAndSlaBreachedFalseAndSlaResolutionDeadlineBefore(activeStatuses, now);

        if (breachedTickets.isEmpty()) {
            return;
        }

        for (Ticket ticket : breachedTickets) {
            ticket.setSlaBreached(true);

            // Auto-escalate priority if not already critical
            if (ticket.getPriority() == Priority.LOW) {
                ticket.setPriority(Priority.MEDIUM);
            } else if (ticket.getPriority() == Priority.MEDIUM) {
                ticket.setPriority(Priority.HIGH);
            } else if (ticket.getPriority() == Priority.HIGH) {
                ticket.setPriority(Priority.CRITICAL);
            }

            ticketRepository.save(ticket);

            String companyCode = ticket.getCompany() != null ? ticket.getCompany().getCompanyCode() : "GLOBAL";
            String title = "⚠️ SLA Breach: " + ticket.getTicketNumber();
            String message = "Ticket '" + ticket.getSubject() + "' has breached SLA resolution deadline and priority escalated to " + ticket.getPriority();

            // Push in-app alert notification and email to Assigned Agent and Company Admin (STRICTLY NOT END_USER)
            try {
                if (ticket.getAssignedTo() != null && ticket.getAssignedTo().getEmail() != null) {
                    notificationService.saveNotification(
                            ticket.getAssignedTo().getEmail(),
                            title,
                            message,
                            "SLA_BREACH",
                            companyCode,
                            "AGENT",
                            "/tickets/" + ticket.getId()
                    );
                    emailService.sendSlaBreachAlert(ticket, ticket.getCompany(), ticket.getAssignedTo(), null);
                } else {
                    notificationService.saveNotification(
                            null,
                            title,
                            message,
                            "SLA_BREACH",
                            companyCode,
                            "COMPANY_ADMIN",
                            "/tickets/" + ticket.getId()
                    );
                }
            } catch (Exception e) {
                log.error("SLA breach notification dispatch error: {}", e.getMessage());
            }

            log.warn("SLA BREACH DETECTED: Ticket {} flagged as breached and escalated to {}", ticket.getTicketNumber(), ticket.getPriority());
        }
    }
}
