package com.ticketpro.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "tickets", indexes = {
    @Index(name = "idx_tickets_ticket_number", columnList = "ticket_number", unique = true),
    @Index(name = "idx_tickets_company_id", columnList = "company_id"),
    @Index(name = "idx_tickets_status", columnList = "status"),
    @Index(name = "idx_tickets_priority", columnList = "priority"),
    @Index(name = "idx_tickets_created_by", columnList = "created_by"),
    @Index(name = "idx_tickets_assigned_to", columnList = "assigned_to"),
    @Index(name = "idx_tickets_created_at", columnList = "created_at"),
    @Index(name = "idx_tickets_company_status", columnList = "company_id, status"),
    @Index(name = "idx_tickets_company_deleted", columnList = "company_id, deleted")
})
@org.hibernate.annotations.SQLRestriction("deleted = false")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_number", nullable = false, unique = true, length = 50)
    private String ticketNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to", nullable = true)
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = true)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_template_id", nullable = true)
    private FormTemplate formTemplate;

    @Column(length = 150)
    private String department;

    @Column(nullable = false, length = 255)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TicketStatus status = TicketStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "first_response_at")
    private LocalDateTime firstResponseAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "sla_response_deadline")
    private LocalDateTime slaResponseDeadline;

    @Column(name = "sla_resolution_deadline")
    private LocalDateTime slaResolutionDeadline;

    @Column(name = "sla_breached", nullable = false)
    private Boolean slaBreached = false;

    @Column(name = "satisfaction_rating")
    private Integer satisfactionRating;

    @Column(name = "satisfaction_feedback", columnDefinition = "TEXT")
    private String satisfactionFeedback;

    @Column(name = "satisfaction_tags", length = 255)
    private String satisfactionTags;

    @Column(name = "satisfaction_rated_at")
    private LocalDateTime satisfactionRatedAt;

    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    private User deletedBy;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    private java.util.List<Attachment> attachments = new java.util.ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (slaBreached == null) {
            slaBreached = false;
        }
        if (deleted == null) {
            deleted = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Ticket(String ticketNumber, Company company, User createdBy, User assignedTo, Category category, String subject, String description, Priority priority, TicketStatus status) {
        this.ticketNumber = ticketNumber;
        this.company = company;
        this.createdBy = createdBy;
        this.assignedTo = assignedTo;
        this.category = category;
        this.subject = subject;
        this.description = description;
        this.priority = priority;
        this.status = status;
        this.slaBreached = false;
    }
}
