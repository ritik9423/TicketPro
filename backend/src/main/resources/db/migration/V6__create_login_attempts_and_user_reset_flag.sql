-- =============================================================================
-- Flyway Database Migration: V6__create_login_attempts_and_user_reset_flag.sql
-- TicketPro Multi-Tenant SaaS Platform
-- Persistent Brute-Force Lockout Storage & Forced Password Reset Flag
-- =============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(180) NOT NULL UNIQUE,
    failed_attempts INT NOT NULL DEFAULT 0,
    last_attempt_time DATETIME,
    locked_until DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_login_attempts_email (email),
    INDEX idx_login_attempts_locked_until (locked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users ADD COLUMN password_reset_required BOOLEAN NOT NULL DEFAULT FALSE;
