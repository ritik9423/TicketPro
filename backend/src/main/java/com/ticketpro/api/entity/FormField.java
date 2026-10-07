package com.ticketpro.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "form_fields", indexes = {
    @Index(name = "idx_form_fields_template", columnList = "form_template_id"),
    @Index(name = "idx_form_fields_order", columnList = "form_template_id, display_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FormField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_template_id", nullable = false)
    private FormTemplate formTemplate;

    @Column(name = "field_type", nullable = false, length = 50)
    private String fieldType; // TEXT, TEXTAREA, NUMBER, EMAIL, DATE, DROPDOWN, RADIO, CHECKBOX, FILE

    @Column(nullable = false, length = 255)
    private String label;

    @Column(name = "field_key", nullable = false, length = 100)
    private String fieldKey;

    @Column(length = 255)
    private String placeholder;

    @Column(nullable = false)
    private Boolean required = false;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "validation_config", columnDefinition = "TEXT")
    private String validationConfig;

    @Column(name = "field_config", columnDefinition = "TEXT")
    private String fieldConfig;

    @OneToMany(mappedBy = "field", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.LAZY)
    @OrderBy("displayOrder ASC")
    private List<FormFieldOption> options = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (required == null) required = false;
        if (displayOrder == null) displayOrder = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
