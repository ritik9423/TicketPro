package com.ticketpro.api.service;

import com.ticketpro.api.entity.Notification;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.repository.NotificationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    private static final Pattern HTML_STYLE_TAGS = Pattern.compile("<style[^>]*>[\\s\\S]*?</style>", Pattern.CASE_INSENSITIVE);
    private static final Pattern HTML_SCRIPT_TAGS = Pattern.compile("<script[^>]*>[\\s\\S]*?</script>", Pattern.CASE_INSENSITIVE);
    private static final Pattern HTML_HEAD_TAGS = Pattern.compile("<head[^>]*>[\\s\\S]*?</head>", Pattern.CASE_INSENSITIVE);
    private static final Pattern HTML_ANY_TAGS = Pattern.compile("<[^>]+>");

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public static String cleanHtmlText(String text) {
        if (text == null || text.isBlank()) return "";
        if (!text.contains("<")) return text.trim();
        
        String clean = HTML_HEAD_TAGS.matcher(text).replaceAll("");
        clean = HTML_STYLE_TAGS.matcher(clean).replaceAll("");
        clean = HTML_SCRIPT_TAGS.matcher(clean).replaceAll("");
        clean = clean.replaceAll("(?i)<br\\s*/?>", " ");
        clean = clean.replaceAll("(?i)</p>", " ");
        clean = clean.replaceAll("(?i)</div>", " ");
        clean = clean.replaceAll("(?i)</tr>", " ");
        clean = HTML_ANY_TAGS.matcher(clean).replaceAll("");
        clean = clean.replace("&nbsp;", " ")
                     .replace("&amp;", "&")
                     .replace("&lt;", "<")
                     .replace("&gt;", ">")
                     .replace("&quot;", "\"")
                     .replace("&#39;", "'");
        return clean.replaceAll("\\s+", " ").trim();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Notification saveNotification(String recipientEmail, String title, String message, String type, String tenantId, String targetRole, String link) {
        String cleanTitle = cleanHtmlText(title);
        String cleanMsg = cleanHtmlText(message);
        if (cleanMsg.length() > 500) {
            cleanMsg = cleanMsg.substring(0, 497) + "...";
        }

        Notification notification = new Notification(
                recipientEmail, 
                cleanTitle != null && !cleanTitle.isBlank() ? cleanTitle : "Notification", 
                cleanMsg, 
                type, 
                tenantId != null ? tenantId.toUpperCase() : "GLOBAL",
                targetRole != null ? targetRole.toUpperCase() : "ALL",
                link != null ? link : "/tickets"
        );
        Notification saved = notificationRepository.save(notification);

        if (messagingTemplate != null) {
            try {
                // Strict targeted WebSocket delivery according to role and recipient
                if (recipientEmail != null && !recipientEmail.isBlank()) {
                    // 1. Direct personal notification (Customer receipt, Agent assignment, personal reply)
                    messagingTemplate.convertAndSend("/topic/notifications/user/" + recipientEmail.toLowerCase(), saved);
                } else if (tenantId != null && !tenantId.isBlank() && !"GLOBAL".equalsIgnoreCase(tenantId)) {
                    // 2. Role-specific tenant stream (Unassigned tickets -> Admins only, Team alerts -> Agents only)
                    String roleTarget = saved.getTargetRole() != null ? saved.getTargetRole().toUpperCase() : "ALL";
                    if ("COMPANY_ADMIN".equals(roleTarget) || "ADMIN".equals(roleTarget)) {
                        messagingTemplate.convertAndSend("/topic/notifications/" + tenantId.toUpperCase() + "/admin", saved);
                    } else if ("AGENT".equals(roleTarget) || "MANAGER".equals(roleTarget)) {
                        messagingTemplate.convertAndSend("/topic/notifications/" + tenantId.toUpperCase() + "/agent", saved);
                    } else {
                        // General broadcast only if explicitly targeted to ALL staff with no specific recipient
                        messagingTemplate.convertAndSend("/topic/notifications/" + tenantId.toUpperCase(), saved);
                    }
                } else {
                    // 3. Platform Root / Super Admin notifications
                    messagingTemplate.convertAndSend("/topic/notifications/SUPER_ADMIN", saved);
                    messagingTemplate.convertAndSend("/topic/notifications/GLOBAL", saved);
                }
            } catch (Exception e) {
                log.error("WebSocket notification broadcast error: {}", e.getMessage());
            }
        }

        return saved;
    }

    public List<Notification> getScopedNotifications(String userEmail, String companyCode, Role role) {
        if (userEmail == null || userEmail.isBlank()) {
            return new ArrayList<>();
        }
        String cleanEmail = userEmail.trim().toLowerCase();

        // 1. SUPER_ADMIN: Global platform alerts, onboarding requests, direct notifications
        if (role == Role.SUPER_ADMIN) {
            List<Notification> global = notificationRepository.findByTenantIdOrderByCreatedAtDesc("GLOBAL");
            List<Notification> direct = notificationRepository.findByRecipientEmailOrderByCreatedAtDesc(cleanEmail);
            
            List<Notification> combined = new ArrayList<>();
            for (Notification n : global) {
                String targetRole = n.getTargetRole() != null ? n.getTargetRole().toUpperCase() : "";
                if ("SUPER_ADMIN".equals(targetRole) || "ALL".equals(targetRole) || cleanEmail.equalsIgnoreCase(n.getRecipientEmail())) {
                    combined.add(n);
                }
            }
            for (Notification n : direct) {
                if (combined.stream().noneMatch(c -> (c.getId() != null && c.getId().equals(n.getId())) || (c == n))) {
                    combined.add(n);
                }
            }
            combined.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
            return combined;
        }

        if (companyCode == null || companyCode.trim().isEmpty()) {
            return new ArrayList<>();
        }

        String tenant = companyCode.toUpperCase();
        List<Notification> tenantNotifs = notificationRepository.findByTenantIdOrderByCreatedAtDesc(tenant);

        // 2. COMPANY_ADMIN:
        // Sees:
        // - Direct notifications addressed to admin's email
        // - Unassigned tickets (TICKET_UNASSIGNED, targetRole == 'COMPANY_ADMIN')
        // - SLA warnings & breaches (SLA_WARNING, SLA_BREACH)
        // - Company setting changes (SYSTEM_ALERT, COMPANY_PROFILE_UPDATED)
        // - Company-wide announcements (targetRole == 'ALL' without a specific other recipient)
        // Does NOT see:
        // - Personal ticket receipt confirmations of end users, or routine personal replies of other agents
        if (role == Role.COMPANY_ADMIN) {
            return tenantNotifs.stream()
                    .filter(n -> {
                        if (cleanEmail.equalsIgnoreCase(n.getRecipientEmail())) return true;
                        
                        String targetRole = n.getTargetRole() != null ? n.getTargetRole().toUpperCase() : "";
                        String type = n.getType() != null ? n.getType().toUpperCase() : "";

                        // If addressed to someone else specifically, admin shouldn't see their personal receipt
                        if (n.getRecipientEmail() != null && !n.getRecipientEmail().isBlank() && !cleanEmail.equalsIgnoreCase(n.getRecipientEmail())) {
                            return "SLA_BREACH".equals(type) || "SLA_WARNING".equals(type);
                        }

                        if ("COMPANY_ADMIN".equals(targetRole) || "ADMIN".equals(targetRole)) return true;
                        if ("SLA_BREACH".equals(type) || "SLA_WARNING".equals(type) || "TICKET_UNASSIGNED".equals(type) || "SYSTEM_ALERT".equals(type)) return true;
                        if ("ALL".equals(targetRole) && (n.getRecipientEmail() == null || n.getRecipientEmail().isBlank())) return true;

                        return false;
                    })
                    .collect(Collectors.toList());
        }

        // 3. AGENT / MANAGER:
        // Sees:
        // - Direct notifications addressed to this agent (assignments, mentions, customer replies on assigned tickets)
        // - Internal notes on tickets they are involved with
        // - Team-wide agent announcements (targetRole == 'AGENT' or 'ALL' with no personal recipient)
        // - SLA warnings on their assigned tickets
        // Does NOT see:
        // - Other agents' personal assignments/replies, customer's personal ticket receipt
        if (role == Role.AGENT || role == Role.MANAGER) {
            return tenantNotifs.stream()
                    .filter(n -> {
                        if (cleanEmail.equalsIgnoreCase(n.getRecipientEmail())) return true;

                        String targetRole = n.getTargetRole() != null ? n.getTargetRole().toUpperCase() : "";

                        // If notification is strictly addressed to another user, agent cannot see it
                        if (n.getRecipientEmail() != null && !n.getRecipientEmail().isBlank()) {
                            return false;
                        }

                        if ("AGENT".equals(targetRole)) return true;
                        if (role == Role.MANAGER && "MANAGER".equals(targetRole)) return true;
                        if ("ALL".equals(targetRole)) return true;

                        return false;
                    })
                    .collect(Collectors.toList());
        }

        // 4. END_USER (Customer):
        // Sees ONLY notifications where recipientEmail == user's email!
        // Strictly blocks internal notes, SLA alerts, unassigned ticket alerts
        return tenantNotifs.stream()
                .filter(n -> cleanEmail.equalsIgnoreCase(n.getRecipientEmail()))
                .filter(n -> {
                    String type = n.getType() != null ? n.getType().toUpperCase() : "";
                    return !"INTERNAL_NOTE".equals(type) && 
                           !"SLA_BREACH".equals(type) && 
                           !"SLA_WARNING".equals(type) && 
                           !"TICKET_UNASSIGNED".equals(type);
                })
                .collect(Collectors.toList());
    }

    public org.springframework.data.domain.Page<Notification> getScopedNotificationsPaged(String userEmail, String companyCode, Role role, org.springframework.data.domain.Pageable pageable) {
        List<Notification> all = getScopedNotifications(userEmail, companyCode, role);
        int start = (int) pageable.getOffset();
        if (start >= all.size()) {
            return new org.springframework.data.domain.PageImpl<>(java.util.Collections.emptyList(), pageable, all.size());
        }
        int end = Math.min(start + pageable.getPageSize(), all.size());
        return new org.springframework.data.domain.PageImpl<>(all.subList(start, end), pageable, all.size());
    }

    public long getScopedUnreadCount(String userEmail, String companyCode, Role role) {
        List<Notification> list = getScopedNotifications(userEmail, companyCode, role);
        return list.stream().filter(n -> !n.isRead()).count();
    }

    public boolean markAsRead(Long notificationId, String userEmail, String companyCode, Role role) {
        Optional<Notification> opt = notificationRepository.findById(notificationId);
        if (opt.isPresent()) {
            Notification n = opt.get();
            if (role == Role.SUPER_ADMIN || (companyCode != null && companyCode.equalsIgnoreCase(n.getTenantId()))) {
                n.setRead(true);
                notificationRepository.save(n);
                return true;
            }
        }
        return false;
    }

    public boolean markAllAsRead(String userEmail, String companyCode, Role role) {
        List<Notification> list = getScopedNotifications(userEmail, companyCode, role);
        List<Notification> unreadList = list.stream().filter(n -> !n.isRead()).toList();
        if (!unreadList.isEmpty()) {
            for (Notification n : unreadList) {
                n.setRead(true);
            }
            notificationRepository.saveAll(unreadList);
        }
        return true;
    }

    public boolean deleteNotification(Long notificationId, String userEmail, String companyCode, Role role) {
        Optional<Notification> opt = notificationRepository.findById(notificationId);
        if (opt.isPresent()) {
            Notification n = opt.get();
            if (role == Role.SUPER_ADMIN || (companyCode != null && companyCode.equalsIgnoreCase(n.getTenantId()))) {
                notificationRepository.delete(n);
                return true;
            }
        }
        return false;
    }

    public boolean clearAllNotifications(String userEmail, String companyCode, Role role) {
        List<Notification> list = getScopedNotifications(userEmail, companyCode, role);
        if (!list.isEmpty()) {
            notificationRepository.deleteAll(list);
        }
        return true;
    }
}
