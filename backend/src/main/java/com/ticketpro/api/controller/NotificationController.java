package com.ticketpro.api.controller;

import com.ticketpro.api.entity.Notification;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.EmailService;
import com.ticketpro.api.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final EmailService emailService;
    private final NotificationService notificationService;

    public NotificationController(EmailService emailService, NotificationService notificationService) {
        this.emailService = emailService;
        this.notificationService = notificationService;
    }

    // SECURITY C-7: Restrict email sending to SUPER_ADMIN and COMPANY_ADMIN only
    @PostMapping("/email")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<Map<String, Object>> sendEmailNotification(
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        String to = payload.get("to");
        String subject = payload.get("subject");
        String body = payload.get("body");
        String message = payload.get("message");
        String targetRole = payload.getOrDefault("targetRole", "ALL");
        String link = payload.getOrDefault("link", "/tickets");
        String type = payload.getOrDefault("type", "TICKET_EVENT");

        if (to == null || to.trim().isEmpty()) {
            throw new IllegalArgumentException("Recipient email address is required.");
        }

        // Enforce tenant ID from authenticated context if user is not Super Admin
        String tenantId;
        if (userDetails != null && userDetails.getRole() != Role.SUPER_ADMIN && userDetails.getUser().getCompany() != null) {
            tenantId = userDetails.getUser().getCompany().getCompanyCode();
        } else {
            tenantId = payload.getOrDefault("tenantId", "GLOBAL");
        }

        // 1. Send physical email via Google SMTP (non-blocking fallback on delivery failure)
        boolean sent = false;
        try {
            sent = emailService.sendHtmlEmail(to, subject, body);
        } catch (Exception ignored) {
            // Non-fatal: persist in-app notification even if SMTP server has transient failure
        }

        // 2. Store clean text notification in database permanently
        String cleanMessage = (message != null && !message.isBlank()) 
                ? message 
                : NotificationService.cleanHtmlText(body != null ? body : "");

        Notification savedNotification = notificationService.saveNotification(
                to,
                subject != null ? subject : "Ticket Notification",
                cleanMessage,
                type,
                tenantId,
                targetRole,
                link
        );

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("emailDelivered", sent);
        response.put("recipient", to);
        response.put("tenantId", tenantId);
        response.put("status", sent ? "DELIVERED_VIA_SMTP" : "STORED_IN_APP");
        response.put("notificationId", savedNotification.getId());

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<?> getUserNotifications(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            org.springframework.data.domain.Pageable pageable) {
        if (userDetails == null) {
            return ResponseEntity.ok(List.of());
        }

        String companyCode = userDetails.getUser().getCompany() != null 
                ? userDetails.getUser().getCompany().getCompanyCode() 
                : null;

        int pageNum = page != null ? page : 0;
        int pageSize = Math.min(size != null ? size : 20, 100);
        org.springframework.data.domain.Pageable paged = org.springframework.data.domain.PageRequest.of(pageNum, pageSize, pageable.getSort());
        org.springframework.data.domain.Page<Notification> notifPage = notificationService.getScopedNotificationsPaged(
                userDetails.getUsername(),
                companyCode,
                userDetails.getRole(),
                paged
        );
        return ResponseEntity.ok(com.ticketpro.api.dto.PagedResponse.from(notifPage, com.ticketpro.api.dto.NotificationResponse::from));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.ok(Map.of("unreadCount", 0));
        }

        String companyCode = userDetails.getUser().getCompany() != null 
                ? userDetails.getUser().getCompany().getCompanyCode() 
                : null;

        long count = notificationService.getScopedUnreadCount(
                userDetails.getUsername(),
                companyCode,
                userDetails.getRole()
        );

        Map<String, Object> res = new HashMap<>();
        res.put("email", userDetails.getUsername());
        res.put("unreadCount", count);
        return ResponseEntity.ok(res);
    }

    @RequestMapping(value = "/{id}/read", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<Map<String, Object>> markAsRead(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (userDetails == null) {
            throw new SecurityException("Authentication required.");
        }

        String companyCode = userDetails.getUser().getCompany() != null 
                ? userDetails.getUser().getCompany().getCompanyCode() 
                : null;

        boolean updated = notificationService.markAsRead(id, userDetails.getUsername(), companyCode, userDetails.getRole());
        Map<String, Object> res = new HashMap<>();
        res.put("success", updated);
        res.put("id", id);
        return ResponseEntity.ok(res);
    }

    @RequestMapping(value = "/read-all", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<Map<String, Object>> markAllAsRead(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("Authentication required.");
        }

        String companyCode = userDetails.getUser().getCompany() != null 
                ? userDetails.getUser().getCompany().getCompanyCode() 
                : null;

        boolean updated = notificationService.markAllAsRead(userDetails.getUsername(), companyCode, userDetails.getRole());
        Map<String, Object> res = new HashMap<>();
        res.put("success", updated);
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteNotification(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (userDetails == null) {
            throw new SecurityException("Authentication required.");
        }

        String companyCode = userDetails.getUser().getCompany() != null 
                ? userDetails.getUser().getCompany().getCompanyCode() 
                : null;

        boolean deleted = notificationService.deleteNotification(id, userDetails.getUsername(), companyCode, userDetails.getRole());
        Map<String, Object> res = new HashMap<>();
        res.put("success", deleted);
        res.put("id", id);
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<Map<String, Object>> clearAllNotifications(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("Authentication required.");
        }

        String companyCode = userDetails.getUser().getCompany() != null 
                ? userDetails.getUser().getCompany().getCompanyCode() 
                : null;

        boolean cleared = notificationService.clearAllNotifications(userDetails.getUsername(), companyCode, userDetails.getRole());
        Map<String, Object> res = new HashMap<>();
        res.put("success", cleared);
        return ResponseEntity.ok(res);
    }
}
