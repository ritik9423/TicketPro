package com.ticketpro.api.repository;

import com.ticketpro.api.entity.FormSubmissionValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormSubmissionValueRepository extends JpaRepository<FormSubmissionValue, Long> {
    List<FormSubmissionValue> findByTicketId(Long ticketId);
    java.util.Optional<FormSubmissionValue> findByTicketIdAndFieldId(Long ticketId, Long fieldId);
    boolean existsByFieldFormTemplateId(Long formTemplateId);
    boolean existsByFieldId(Long fieldId);
    void deleteByTicketId(Long ticketId);
}
