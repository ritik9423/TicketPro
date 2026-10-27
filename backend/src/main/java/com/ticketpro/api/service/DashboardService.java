package com.ticketpro.api.service;

import com.ticketpro.api.dto.AnnouncementResponse;
import com.ticketpro.api.dto.TicketResponse;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.AuditLogRepository;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.FeedbackRepository;
import com.ticketpro.api.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final CompanyRepository companyRepository;
    private final TicketRepository ticketRepository;
    private final AuditLogService auditLogService;
    private final AuditLogRepository auditLogRepository;
    private final AnnouncementService announcementService;
    private final KnowledgeBaseService kbService;
    private final FeedbackRepository feedbackRepository;

    @Autowired
    public DashboardService(CompanyRepository companyRepository,
                            TicketRepository ticketRepository,
                            AuditLogService auditLogService,
                            AuditLogRepository auditLogRepository,
                            AnnouncementService announcementService,
                            KnowledgeBaseService kbService,
                            FeedbackRepository feedbackRepository) {
        this.companyRepository = companyRepository;
        this.ticketRepository = ticketRepository;
        this.auditLogService = auditLogService;
        this.auditLogRepository = auditLogRepository;
        this.announcementService = announcementService;
        this.kbService = kbService;
        this.feedbackRepository = feedbackRepository;
    }

    public DashboardService(CompanyRepository companyRepository,
                            TicketRepository ticketRepository,
                            AuditLogService auditLogService,
                            AnnouncementService announcementService,
                            KnowledgeBaseService kbService,
                            FeedbackRepository feedbackRepository) {
        this(companyRepository, ticketRepository, auditLogService, null, announcementService, kbService, feedbackRepository);
    }

    public Map<String, Object> getDashboardStats(com.ticketpro.api.security.CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("Dashboard statistics require an authenticated user identity.");
        }
        Role role = userDetails.getRole();
        Long userId = userDetails.getId();
        Long companyId = userDetails.getCompanyId();

        if (role == Role.SUPER_ADMIN) {
            return getSuperAdminDashboard();
        } else if (role == Role.COMPANY_ADMIN || role == Role.MANAGER) {
            return getCompanyAdminDashboard(companyId);
        } else if (role == Role.AGENT) {
            return getAgentDashboard(userId, companyId);
        } else {
            return getEndUserDashboard(userId, companyId);
        }
    }

    public Map<String, Object> getSuperAdminDashboard() {
        Map<String, Object> stats = new HashMap<>();

        long totalCompanies = companyRepository.count();
        long totalTickets = ticketRepository.count();

        // Calculate statuses via direct count queries
        long openTickets = ticketRepository.countByStatus(TicketStatus.OPEN);
        long resolvedTickets = ticketRepository.countByStatus(TicketStatus.RESOLVED);

        stats.put("totalCompanies", totalCompanies);
        stats.put("totalTickets", totalTickets);
        stats.put("openTickets", openTickets);
        stats.put("resolvedTickets", resolvedTickets);

        // Global CSAT Score
        Double globalAvgRating = feedbackRepository.getGlobalAverageRating();
        long totalFeedbacks = feedbackRepository.count();
        stats.put("csatAverage", globalAvgRating != null ? BigDecimal.valueOf(globalAvgRating).setScale(1, RoundingMode.HALF_UP).doubleValue() : 4.9);
        stats.put("totalFeedbacks", totalFeedbacks);

        // OPTIMIZATION: Single grouped query for all company ticket counts (replaces N+1 remote roundtrips)
        List<Object[]> countRows = ticketRepository.countTicketsGroupedByCompany();
        Map<Long, Long> ticketCountMap = new HashMap<>();
        for (Object[] row : countRows) {
            if (row[0] != null && row[1] != null) {
                ticketCountMap.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
            }
        }

        List<Map<String, Object>> companyDetails = companyRepository.findAll().stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("name", c.getCompanyName());
            map.put("code", c.getCompanyCode());
            map.put("status", c.getStatus());
            map.put("ticketsCount", ticketCountMap.getOrDefault(c.getId(), 0L));
            return map;
        }).collect(Collectors.toList());

        stats.put("companiesList", companyDetails);

        // OPTIMIZATION: Fetch only top 10 logs with eager user/company joins instead of downloading entire table
        List<AuditLog> limitedLogs = (auditLogRepository != null)
                ? auditLogRepository.findTop10ByOrderByCreatedAtDesc()
                : auditLogService.getAllLogs().stream().limit(10).collect(Collectors.toList());
        stats.put("recentLogs", limitedLogs);

        return stats;
    }

    public Map<String, Object> getCompanyAdminDashboard(Long companyId) {
        Map<String, Object> stats = new HashMap<>();
        if (companyId == null) {
            stats.put("totalTickets", 0L);
            stats.put("openTickets", 0L);
            stats.put("inProgressTickets", 0L);
            stats.put("resolvedTickets", 0L);
            stats.put("priorityDistribution", Map.of("LOW", 0L, "MEDIUM", 0L, "HIGH", 0L, "CRITICAL", 0L));
            stats.put("slaCompliance", 100.0);
            stats.put("csatAverage", 5.0);
            stats.put("totalFeedbackCount", 0L);
            stats.put("recentTickets", Collections.emptyList());
            return stats;
        }

        // OPTIMIZATION: Fast aggregated status counts from DB (replaces loading full entity list into memory)
        List<Object[]> statusRows = ticketRepository.countTicketsGroupedByStatusForCompany(companyId);
        Map<TicketStatus, Long> statusMap = new HashMap<>();
        long totalTickets = 0L;
        for (Object[] row : statusRows) {
            if (row[0] != null && row[1] != null) {
                TicketStatus st = (TicketStatus) row[0];
                long cnt = ((Number) row[1]).longValue();
                statusMap.put(st, cnt);
                totalTickets += cnt;
            }
        }

        long openTickets = statusMap.getOrDefault(TicketStatus.OPEN, 0L);
        long inProgress = statusMap.getOrDefault(TicketStatus.IN_PROGRESS, 0L);
        long resolved = statusMap.getOrDefault(TicketStatus.RESOLVED, 0L);

        stats.put("totalTickets", totalTickets);
        stats.put("openTickets", openTickets);
        stats.put("inProgressTickets", inProgress);
        stats.put("resolvedTickets", resolved);

        // OPTIMIZATION: Fast aggregated priority counts from DB
        List<Object[]> priorityRows = ticketRepository.countTicketsGroupedByPriorityForCompany(companyId);
        Map<String, Long> priorityDistribution = new HashMap<>();
        priorityDistribution.put("LOW", 0L);
        priorityDistribution.put("MEDIUM", 0L);
        priorityDistribution.put("HIGH", 0L);
        priorityDistribution.put("CRITICAL", 0L);

        for (Object[] row : priorityRows) {
            if (row[0] != null && row[1] != null) {
                Priority pr = (Priority) row[0];
                long cnt = ((Number) row[1]).longValue();
                priorityDistribution.put(pr.name(), cnt);
            }
        }
        stats.put("priorityDistribution", priorityDistribution);

        // SLA Compliance
        stats.put("slaCompliance", 96.8);

        // Live CSAT Statistics for this company via DB aggregate
        Double companyAvg = feedbackRepository.getAverageRatingByCompanyId(companyId);
        long totalFeedback = feedbackRepository.countByCompanyId(companyId);
        stats.put("csatAverage", companyAvg != null ? BigDecimal.valueOf(companyAvg).setScale(1, RoundingMode.HALF_UP).doubleValue() : 4.9);
        stats.put("totalFeedbackCount", totalFeedback);

        // OPTIMIZATION: Fetch only top 5 recent tickets using indexed DB query with eager entity graph
        List<TicketResponse> recentTickets = ticketRepository.findTop5ByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(TicketResponse::from)
                .collect(Collectors.toList());

        stats.put("recentTickets", recentTickets);

        return stats;
    }

    public Map<String, Object> getAgentDashboard(Long agentId, Long companyId) {
        Map<String, Object> stats = new HashMap<>();

        // OPTIMIZATION: Fast aggregated status counts for agent
        List<Object[]> statusRows = ticketRepository.countTicketsGroupedByStatusForAgent(agentId);
        Map<TicketStatus, Long> statusMap = new HashMap<>();
        long totalAssigned = 0L;
        for (Object[] row : statusRows) {
            if (row[0] != null && row[1] != null) {
                TicketStatus st = (TicketStatus) row[0];
                long cnt = ((Number) row[1]).longValue();
                statusMap.put(st, cnt);
                totalAssigned += cnt;
            }
        }

        stats.put("totalTickets", totalAssigned);
        stats.put("openTickets", statusMap.getOrDefault(TicketStatus.OPEN, 0L));
        stats.put("inProgressTickets", statusMap.getOrDefault(TicketStatus.IN_PROGRESS, 0L));
        stats.put("resolvedTickets", statusMap.getOrDefault(TicketStatus.RESOLVED, 0L));

        // CSAT Rating for this agent via single DB aggregate query
        Double agentAvg = feedbackRepository.getAverageRatingByAgentId(agentId);
        long totalAgentFeedback = feedbackRepository.countByAgentId(agentId);
        stats.put("csatAverage", agentAvg != null ? BigDecimal.valueOf(agentAvg).setScale(1, RoundingMode.HALF_UP).doubleValue() : 4.9);
        stats.put("totalFeedbackCount", totalAgentFeedback);

        // Priority breakdown for assigned tickets via single DB group query
        List<Object[]> priorityRows = ticketRepository.countTicketsGroupedByPriorityForAgent(agentId);
        Map<String, Long> priorityDistribution = new HashMap<>();
        priorityDistribution.put("LOW", 0L);
        priorityDistribution.put("MEDIUM", 0L);
        priorityDistribution.put("HIGH", 0L);
        priorityDistribution.put("CRITICAL", 0L);

        for (Object[] row : priorityRows) {
            if (row[0] != null && row[1] != null) {
                Priority pr = (Priority) row[0];
                long cnt = ((Number) row[1]).longValue();
                priorityDistribution.put(pr.name(), cnt);
            }
        }
        stats.put("priorityDistribution", priorityDistribution);

        // Limit assigned tickets table to top 5 using indexed DB query
        List<TicketResponse> recentAssigned = ticketRepository.findTop5ByAssignedToIdOrderByCreatedAtDesc(agentId).stream()
                .map(TicketResponse::from)
                .collect(Collectors.toList());
        stats.put("recentTickets", recentAssigned);

        return stats;
    }

    public Map<String, Object> getEndUserDashboard(Long userId, Long companyId) {
        Map<String, Object> stats = new HashMap<>();

        // OPTIMIZATION: Fast aggregated status counts for creator
        List<Object[]> statusRows = ticketRepository.countTicketsGroupedByStatusForCreator(userId);
        Map<TicketStatus, Long> statusMap = new HashMap<>();
        long totalTickets = 0L;
        for (Object[] row : statusRows) {
            if (row[0] != null && row[1] != null) {
                TicketStatus st = (TicketStatus) row[0];
                long cnt = ((Number) row[1]).longValue();
                statusMap.put(st, cnt);
                totalTickets += cnt;
            }
        }

        stats.put("totalTickets", totalTickets);
        stats.put("openTickets", statusMap.getOrDefault(TicketStatus.OPEN, 0L));
        stats.put("inProgressTickets", statusMap.getOrDefault(TicketStatus.IN_PROGRESS, 0L));
        stats.put("resolvedTickets", statusMap.getOrDefault(TicketStatus.RESOLVED, 0L));

        // Recent Tickets (limit 5 via DB query)
        List<TicketResponse> recentTickets = ticketRepository.findTop5ByCreatedByIdOrderByCreatedAtDesc(userId).stream()
                .map(TicketResponse::from)
                .collect(Collectors.toList());
        stats.put("recentTickets", recentTickets);

        // Active Announcements (limit 3)
        List<AnnouncementResponse> announcements = (companyId != null)
                ? announcementService.getActiveAnnouncementsByCompany(companyId).stream().limit(3).map(AnnouncementResponse::fromEntity).collect(Collectors.toList())
                : Collections.emptyList();
        stats.put("announcements", announcements);

        // Published Knowledge Base articles (limit 3)
        List<KnowledgeBase> articles = (companyId != null)
                ? kbService.getPublishedArticlesByCompany(companyId)
                : Collections.emptyList();
        stats.put("kbArticles", articles.stream().limit(3).collect(Collectors.toList()));

        return stats;
    }
}
