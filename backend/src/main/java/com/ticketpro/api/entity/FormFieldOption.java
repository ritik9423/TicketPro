package com.ticketpro.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "form_field_options", indexes = {
    @Index(name = "idx_form_field_options_field", columnList = "field_id, display_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FormFieldOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "field_id", nullable = false)
    private FormField field;

    @Column(nullable = false, length = 255)
    private String label;

    @Column(nullable = false, length = 255)
    private String value;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;
}
