package com.ticketpro.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Warms up the HikariCP connection pool immediately after application startup
 * and verifies/creates critical query performance indexes on the remote database.
 */
@Component
public class ConnectionPoolWarmup {

    private static final Logger log = LoggerFactory.getLogger(ConnectionPoolWarmup.class);

    private final DataSource dataSource;

    public ConnectionPoolWarmup(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void warmupPool() {
        log.info("[TicketPro] Warming up database connection pool and verifying indexes...");
        try (Connection conn = dataSource.getConnection()) {
            conn.createStatement().execute("SELECT 1");
            log.info("[TicketPro] Connection pool warm — first connection established in background.");

            // Ensure missing high-traffic performance indexes exist on remote cloud DB
            ensurePerformanceIndexes(conn);
        } catch (Exception e) {
            log.warn("[TicketPro] Connection pool warmup / index check encountered: {}", e.getMessage());
        }
    }

    private void ensurePerformanceIndexes(Connection conn) {
        try {
            ensureIndex(conn, "notifications", "idx_notif_tenant_recip", "tenant_id, recipient_email, is_read, created_at");
            ensureIndex(conn, "notifications", "idx_notif_tenant_read", "tenant_id, is_read, created_at");
            ensureIndex(conn, "notifications", "idx_notif_tenant_role", "tenant_id, target_role, created_at");
            ensureIndex(conn, "notifications", "idx_notif_recip_created", "recipient_email, created_at");

            ensureIndex(conn, "audit_logs", "idx_auditlog_company_created", "company_id, created_at");
            ensureIndex(conn, "audit_logs", "idx_auditlog_created", "created_at");

            ensureIndex(conn, "feedbacks", "idx_fb_agent_created", "agent_id, created_at");
            ensureIndex(conn, "feedbacks", "idx_fb_company_created", "company_id, created_at");
            ensureIndex(conn, "feedbacks", "idx_fb_ticket", "ticket_id");

            ensureIndex(conn, "users", "idx_usr_email", "email");
            ensureIndex(conn, "users", "idx_usr_company_status", "company_id, status");

            ensureIndex(conn, "categories", "idx_cat_company", "company_id");
            ensureIndex(conn, "ticket_history", "idx_th_ticket_created", "ticket_id, created_at");

            ensureIndex(conn, "tickets", "idx_tickets_comp_status", "company_id, status, created_at");
            ensureIndex(conn, "tickets", "idx_tickets_comp_prio", "company_id, priority, created_at");
        } catch (Exception e) {
            log.debug("[TicketPro] Index optimization finished with minor notes: {}", e.getMessage());
        }
    }

    private void ensureIndex(Connection conn, String table, String indexName, String columns) {
        String checkSql = "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?";
        try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
            checkStmt.setString(1, table);
            checkStmt.setString(2, indexName);
            try (ResultSet rs = checkStmt.executeQuery()) {
                if (rs.next() && rs.getInt(1) == 0) {
                    String createSql = "ALTER TABLE " + table + " ADD INDEX " + indexName + " (" + columns + ")";
                    try (Statement stmt = conn.createStatement()) {
                        stmt.execute(createSql);
                        log.info("[TicketPro] Created performance index {} on table {}", indexName, table);
                    }
                }
            }
        } catch (Exception e) {
            log.debug("[TicketPro] Index {} on {}: {}", indexName, table, e.getMessage());
        }
    }
}
