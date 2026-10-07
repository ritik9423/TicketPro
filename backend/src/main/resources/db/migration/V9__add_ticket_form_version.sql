-- =============================================================================
-- Flyway Database Migration: V9__add_ticket_form_version.sql
-- TicketPro Multi-Tenant SaaS Platform
-- Links tickets to specific immutable form template versions
-- =============================================================================

ALTER TABLE tickets
    ADD COLUMN form_template_id BIGINT NULL,
    ADD CONSTRAINT fk_tickets_form_template FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE SET NULL,
    ADD INDEX idx_tickets_form_template (form_template_id);
