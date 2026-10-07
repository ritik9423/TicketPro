-- =============================================================================
-- Flyway Database Migration: V5__add_performance_indexes.sql
-- TicketPro Multi-Tenant SaaS Platform
-- High-Performance Composite Indexes for Multi-Tenant Query Optimization
-- =============================================================================

-- 1. Multi-tenant composite index on tickets by company and priority
ALTER TABLE tickets ADD INDEX idx_tickets_company_priority (company_id, priority);

-- 2. Performance index on tickets by assigned agent and creation date
ALTER TABLE tickets ADD INDEX idx_tickets_assigned_created (assigned_to, created_at);

-- 3. High-traffic composite index on ticket comments
ALTER TABLE ticket_comments ADD INDEX idx_comments_ticket_created (ticket_id, created_at);

-- 4. Fast polling & notification read-state lookup index
ALTER TABLE notifications ADD INDEX idx_notifications_user_read (recipient_email, is_read, created_at);

-- 5. Multi-tenant user lookup by company and role
ALTER TABLE users ADD INDEX idx_users_company_role (company_id, role);

-- 6. CSAT feedback analytics index by company and rating
ALTER TABLE feedbacks ADD INDEX idx_feedbacks_company_rating (company_id, rating);
