package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientEmailOrderByCreatedAtDesc(String recipientEmail);
    org.springframework.data.domain.Page<Notification> findByRecipientEmailOrderByCreatedAtDesc(String recipientEmail, org.springframework.data.domain.Pageable pageable);
    List<Notification> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    org.springframework.data.domain.Page<Notification> findByTenantIdOrderByCreatedAtDesc(String tenantId, org.springframework.data.domain.Pageable pageable);
    List<Notification> findByTenantIdAndRecipientEmailOrderByCreatedAtDesc(String tenantId, String recipientEmail);
    org.springframework.data.domain.Page<Notification> findByTenantIdAndRecipientEmailOrderByCreatedAtDesc(String tenantId, String recipientEmail, org.springframework.data.domain.Pageable pageable);
    List<Notification> findByTenantIdAndTargetRoleInOrderByCreatedAtDesc(String tenantId, List<String> targetRoles);
    long countByRecipientEmailAndReadFalse(String recipientEmail);
    long countByTenantIdAndRecipientEmailAndReadFalse(String tenantId, String recipientEmail);
    void deleteByRecipientEmail(String recipientEmail);
}

