package com.ticketpro.api.repository;

import com.ticketpro.api.entity.FormField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormFieldRepository extends JpaRepository<FormField, Long> {
    List<FormField> findByFormTemplateIdOrderByDisplayOrderAsc(Long formTemplateId);
}
