-- =============================================================================
-- Flyway Database Migration: V7__ticket_soft_delete_and_history.sql
-- TicketPro Multi-Tenant SaaS Platform
-- Soft Delete support for Tickets and Dedicated Audit Ticket History
-- =============================================================================

ALTER TABLE tickets ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tickets ADD COLUMN deleted_at DATETIME NULL;
ALTER TABLE tickets ADD COLUMN deleted_by BIGINT NULL;

ALTER TABLE tickets ADD CONSTRAINT fk_tickets_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_tickets_company_deleted ON tickets (company_id, deleted);

CREATE TABLE IF NOT EXISTS ticket_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    changed_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ticket_history_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_ticket_history_ticket_created (ticket_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
