package com.ticketpro.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = true)
    private Company company;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @JsonIgnore
    @Column(nullable = false, length = 255)
    private String password;

    @Column(length = 20)
    private String phone;

    @Column(length = 150)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private UserStatus status = UserStatus.ACTIVE;

    @Column(name = "password_reset_required")
    private Boolean passwordResetRequired = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public User(Company company, String name, String email, String password, String phone, Role role, UserStatus status) {
        this.company = company;
        this.name = name;
        this.email = email;
        this.password = password;
        this.phone = phone;
        this.role = role;
        this.status = status != null ? status : UserStatus.ACTIVE;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (email == null || email.isBlank()) {
            String compDomain = (company != null && company.getCompanyCode() != null) ? company.getCompanyCode().toLowerCase() : "corp";
            String safeName = name != null ? name.replaceAll("[^a-zA-Z0-9]", ".").toLowerCase() : "user." + System.currentTimeMillis();
            email = safeName + "@" + compDomain + ".local";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (email == null || email.isBlank()) {
            String compDomain = (company != null && company.getCompanyCode() != null) ? company.getCompanyCode().toLowerCase() : "corp";
            String safeName = name != null ? name.replaceAll("[^a-zA-Z0-9]", ".").toLowerCase() : "user." + System.currentTimeMillis();
            email = safeName + "@" + compDomain + ".local";
        }
    }
}
