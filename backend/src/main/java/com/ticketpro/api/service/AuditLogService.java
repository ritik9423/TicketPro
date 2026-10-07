package com.ticketpro.api.service;

import com.ticketpro.api.entity.AuditLog;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public List<AuditLog> getLogsByCompany(Long companyId) {
        return auditLogRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }

    public org.springframework.data.domain.Page<AuditLog> getLogsByCompanyPaged(Long companyId, org.springframework.data.domain.Pageable pageable) {
        return auditLogRepository.findByCompanyIdOrderByCreatedAtDesc(companyId, pageable);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }

    public org.springframework.data.domain.Page<AuditLog> getAllLogsPaged(org.springframework.data.domain.Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Transactional
    public void log(User user, Company company, String action, String entityType, Long entityId, String description, String ipAddress) {
        String resolvedIp = ipAddress;
        if (resolvedIp == null || resolvedIp.isBlank()) {
            resolvedIp = getCurrentRequestIp();
        }
        AuditLog log = new AuditLog(user, company, action, entityType, entityId, description, resolvedIp);
        auditLogRepository.save(log);
    }

    private String getCurrentRequestIp() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String remoteAddr = request.getRemoteAddr();
                return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "127.0.0.1";
            }
        } catch (Exception ignored) {}
        return "127.0.0.1";
    }
}
