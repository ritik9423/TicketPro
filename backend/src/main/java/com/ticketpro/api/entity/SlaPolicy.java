package com.ticketpro.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "sla_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SlaPolicy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Priority priority;

    @Column(name = "response_time_minutes", nullable = false)
    private int responseTimeMinutes;

    @Column(name = "resolution_time_minutes", nullable = false)
    private int resolutionTimeMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SlaStatus status = SlaStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Explicit seed constructor preservation
    public SlaPolicy(Company company, String name, Priority priority, int responseTimeMinutes, int resolutionTimeMinutes, SlaStatus status) {
        this.company = company;
        this.name = name;
        this.priority = priority;
        this.responseTimeMinutes = responseTimeMinutes;
        this.resolutionTimeMinutes = resolutionTimeMinutes;
        this.status = status;
    }
}
