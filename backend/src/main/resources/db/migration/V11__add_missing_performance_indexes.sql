-- =============================================================================
-- Flyway Migration: V11__add_missing_performance_indexes.sql
-- TicketPro Multi-Tenant SaaS Platform
-- Fix slow queries on deployed remote database (Aiven Cloud MySQL)
-- Adds missing indexes on notifications, audit_logs, feedbacks, and users
-- =============================================================================

-- Helper: MySQL 8.0 doesn't support IF NOT EXISTS for CREATE INDEX,
-- so we use a stored procedure to safely add indexes only if missing.

DROP PROCEDURE IF EXISTS add_index_if_missing;

DELIMITER //
CREATE PROCEDURE add_index_if_missing(
    IN tbl VARCHAR(128),
    IN idx VARCHAR(128),
    IN cols VARCHAR(512)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
    ) THEN
        SET @sql = CONCAT('CREATE INDEX ', idx, ' ON ', tbl, ' (', cols, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Notifications: fast lookup by tenant + recipient + read status (dashboard polling)
CALL add_index_if_missing('notifications', 'idx_notif_tenant_recip', 'tenant_id, recipient_email, is_read, created_at');

-- Notifications: fast unread count per tenant + recipient
CALL add_index_if_missing('notifications', 'idx_notif_tenant_read', 'tenant_id, is_read, created_at');

-- Notifications: target_role broadcast queries
CALL add_index_if_missing('notifications', 'idx_notif_tenant_role', 'tenant_id, target_role, created_at');

-- Notifications: recipient + created_at for user-scoped queries
CALL add_index_if_missing('notifications', 'idx_notif_recip_created', 'recipient_email, created_at');

-- Audit Logs: fast company-scoped timeline queries
CALL add_index_if_missing('audit_logs', 'idx_auditlog_company_created', 'company_id, created_at');

-- Audit Logs: fast global timeline (super admin dashboard)
CALL add_index_if_missing('audit_logs', 'idx_auditlog_created', 'created_at');

-- Feedbacks: fast agent-scoped CSAT queries
CALL add_index_if_missing('feedbacks', 'idx_fb_agent_created', 'agent_id, created_at');

-- Feedbacks: fast company-scoped CSAT queries
CALL add_index_if_missing('feedbacks', 'idx_fb_company_created', 'company_id, created_at');

-- Feedbacks: fast ticket lookup
CALL add_index_if_missing('feedbacks', 'idx_fb_ticket', 'ticket_id');

-- Users: fast email lookup for authentication
CALL add_index_if_missing('users', 'idx_usr_email', 'email');

-- Users: fast company-scoped user listing
CALL add_index_if_missing('users', 'idx_usr_company_status', 'company_id, status');

-- Categories: fast company-scoped lookups
CALL add_index_if_missing('categories', 'idx_cat_company', 'company_id');

-- Ticket History: fast ticket timeline queries
CALL add_index_if_missing('ticket_history', 'idx_th_ticket_created', 'ticket_id, created_at');

-- Clean up helper procedure
DROP PROCEDURE IF EXISTS add_index_if_missing;
