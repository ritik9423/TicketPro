package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
    org.springframework.data.domain.Page<Comment> findByTicketIdOrderByCreatedAtAsc(Long ticketId, org.springframework.data.domain.Pageable pageable);
    List<Comment> findByTicketIdAndIsInternalFalseOrderByCreatedAtAsc(Long ticketId);
    org.springframework.data.domain.Page<Comment> findByTicketIdAndIsInternalFalseOrderByCreatedAtAsc(Long ticketId, org.springframework.data.domain.Pageable pageable);
    List<Comment> findByUserId(Long userId);
}
