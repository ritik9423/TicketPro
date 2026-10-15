package com.ticketpro.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "announcements")
@Getter
@Setter
@AllArgsConstructor
public class Announcement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AnnouncementStatus status;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Announcement() {
        this.status = AnnouncementStatus.ACTIVE;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = AnnouncementStatus.ACTIVE;
        }
    }

    // Explicit seed constructor preservation
    public Announcement(Company company, String title, String message, AnnouncementStatus status, User createdBy) {
        this.company = company;
        this.title = title;
        this.message = message;
        this.status = status != null ? status : AnnouncementStatus.ACTIVE;
        this.createdBy = createdBy;
    }
}
