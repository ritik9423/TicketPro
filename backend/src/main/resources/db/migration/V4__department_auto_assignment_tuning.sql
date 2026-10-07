-- =============================================================================
-- Flyway Database Migration: V4__department_auto_assignment_tuning.sql
-- TicketPro Multi-Tenant SaaS Platform
-- High-Performance Composite Indexes for Multi-Tenant Auto-Assignment & Queue Routing
-- =============================================================================

-- 1. Multi-tenant composite index on users for least-loaded agent query performance
ALTER TABLE users ADD INDEX idx_users_company_role_status_dept (company_id, role, status, department);

-- 2. Multi-tenant composite index on tickets for department queue resolution
ALTER TABLE tickets ADD INDEX idx_tickets_company_dept (company_id, department);
