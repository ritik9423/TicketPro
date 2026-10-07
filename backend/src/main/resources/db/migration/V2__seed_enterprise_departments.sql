-- =============================================================================
-- Flyway Database Migration: V2__seed_enterprise_departments.sql
-- TicketPro Multi-Tenant SaaS Platform
-- Populates baseline departments for active companies
-- =============================================================================

INSERT INTO departments (company_id, name, code, description, status)
SELECT c.id, 'IT & Infrastructure', 'IT-DEPT', 'Hardware, software, server and network support', 'ACTIVE'
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.company_id = c.id AND d.name = 'IT & Infrastructure');

INSERT INTO departments (company_id, name, code, description, status)
SELECT c.id, 'Human Resources (HR)', 'HR-DEPT', 'Employee onboarding, payroll and policies', 'ACTIVE'
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.company_id = c.id AND d.name = 'Human Resources (HR)');

INSERT INTO departments (company_id, name, code, description, status)
SELECT c.id, 'Finance & Accounting', 'FIN-DEPT', 'Billing, invoicing, refunds and tax claims', 'ACTIVE'
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.company_id = c.id AND d.name = 'Finance & Accounting');

INSERT INTO departments (company_id, name, code, description, status)
SELECT c.id, 'Customer Support', 'SUP-DEPT', 'Frontline helpdesk and customer escalation desk', 'ACTIVE'
FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.company_id = c.id AND d.name = 'Customer Support');
