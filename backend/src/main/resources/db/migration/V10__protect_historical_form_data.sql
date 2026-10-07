-- =============================================================================
-- Flyway Database Migration: V10__protect_historical_form_data.sql
-- TicketPro Multi-Tenant SaaS Platform
-- Hardens Foreign Keys: Replaces CASCADE / SET NULL with RESTRICT on Form Versions
-- =============================================================================

-- 1. Protect ticket's immutable reference to its form template version:
-- Replaces ON DELETE SET NULL with ON DELETE RESTRICT so historical form version references cannot be erased.
ALTER TABLE tickets
    DROP FOREIGN KEY fk_tickets_form_template;

ALTER TABLE tickets
    ADD CONSTRAINT fk_tickets_form_template
    FOREIGN KEY (form_template_id) REFERENCES form_templates(id)
    ON DELETE RESTRICT;

-- 2. Protect historical form submission values:
-- Replaces ON DELETE CASCADE with ON DELETE RESTRICT so submitted form data is never deleted by form field removal.
ALTER TABLE form_submission_values
    DROP FOREIGN KEY fk_form_submission_field;

ALTER TABLE form_submission_values
    ADD CONSTRAINT fk_form_submission_field
    FOREIGN KEY (field_id) REFERENCES form_fields(id)
    ON DELETE RESTRICT;

-- 3. Protect historical form fields from template deletion:
-- Replaces ON DELETE CASCADE with ON DELETE RESTRICT so historical fields cannot be deleted.
ALTER TABLE form_fields
    DROP FOREIGN KEY fk_form_fields_template;

ALTER TABLE form_fields
    ADD CONSTRAINT fk_form_fields_template
    FOREIGN KEY (form_template_id) REFERENCES form_templates(id)
    ON DELETE RESTRICT;

-- 4. Protect form field options from field deletion:
ALTER TABLE form_field_options
    DROP FOREIGN KEY fk_form_field_options_field;

ALTER TABLE form_field_options
    ADD CONSTRAINT fk_form_field_options_field
    FOREIGN KEY (field_id) REFERENCES form_fields(id)
    ON DELETE RESTRICT;
