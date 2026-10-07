package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByTicketId(Long ticketId);
    org.springframework.data.domain.Page<Attachment> findByTicketId(Long ticketId, org.springframework.data.domain.Pageable pageable);
    Optional<Attachment> findByFileUrlContaining(String fileName);
    Optional<Attachment> findFirstByFileNameOrderByIdDesc(String fileName);
    List<Attachment> findByFileName(String fileName);
}
