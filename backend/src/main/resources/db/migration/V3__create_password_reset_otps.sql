-- =============================================================================
-- Flyway Database Migration: V3__create_password_reset_otps.sql
-- TicketPro Multi-Tenant SaaS Platform: Secure Password Reset OTP Storage
-- Dialect: MySQL 8.x (InnoDB, utf8mb4)
-- =============================================================================

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(180) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expiry_time DATETIME NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reset_otp_email (email),
    INDEX idx_reset_otp_expiry (expiry_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
