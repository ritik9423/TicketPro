package com.ticketpro.api.controller;

import com.ticketpro.api.dto.AuditLogResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.entity.AuditLog;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.AuditLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Pageable pageable) {
        
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        int pageNum = page != null ? page : 0;
        int pageSize = Math.min(size != null ? size : 20, 100);
        Pageable paged = PageRequest.of(pageNum, pageSize, pageable.getSort());
        Page<AuditLog> logPage;
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            if (companyId != null) {
                logPage = auditLogService.getLogsByCompanyPaged(companyId, paged);
            } else {
                logPage = auditLogService.getAllLogsPaged(paged);
            }
        } else if (userDetails.getCompanyId() != null) {
            logPage = auditLogService.getLogsByCompanyPaged(userDetails.getCompanyId(), paged);
        } else {
            logPage = Page.empty(paged);
        }
        return ResponseEntity.ok(PagedResponse.from(logPage, AuditLogResponse::from));
    }
}
