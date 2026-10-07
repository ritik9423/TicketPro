-- =============================================================================
-- Flyway Database Migration: V8__dynamic_form_tables.sql
-- TicketPro Multi-Tenant SaaS Platform
-- Normalized Dynamic Form Builder Schema: Templates, Fields, Options & Submissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS form_templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT NOT NULL,
    category_id BIGINT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_form_templates_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_form_templates_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_form_templates_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_form_templates_company (company_id),
    INDEX idx_form_templates_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS form_fields (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    form_template_id BIGINT NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    field_key VARCHAR(100) NOT NULL,
    placeholder VARCHAR(255) NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    validation_config TEXT NULL,
    field_config TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_form_fields_template FOREIGN KEY (form_template_id) REFERENCES form_templates(id) ON DELETE CASCADE,
    INDEX idx_form_fields_template (form_template_id),
    INDEX idx_form_fields_order (form_template_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS form_field_options (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    field_id BIGINT NOT NULL,
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_form_field_options_field FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE,
    INDEX idx_form_field_options_field (field_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS form_submission_values (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    field_id BIGINT NOT NULL,
    value TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_form_submission_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_form_submission_field FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE,
    INDEX idx_form_submission_ticket (ticket_id),
    INDEX idx_form_submission_field (field_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
