package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Feedback;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    Optional<Feedback> findByTicketId(Long ticketId);

    boolean existsByTicketId(Long ticketId);

    @EntityGraph(attributePaths = {"ticket", "company", "customer", "agent"})
    List<Feedback> findByCompanyIdOrderByCreatedAtDesc(Long companyId);

    @EntityGraph(attributePaths = {"ticket", "company", "customer", "agent"})
    org.springframework.data.domain.Page<Feedback> findByCompanyIdOrderByCreatedAtDesc(Long companyId, org.springframework.data.domain.Pageable pageable);

    @EntityGraph(attributePaths = {"ticket", "company", "customer", "agent"})
    List<Feedback> findByAgentIdOrderByCreatedAtDesc(Long agentId);

    @EntityGraph(attributePaths = {"ticket", "company", "customer", "agent"})
    List<Feedback> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"ticket", "company", "customer", "agent"})
    org.springframework.data.domain.Page<Feedback> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

    @Query("SELECT AVG(f.rating) FROM Feedback f WHERE f.company.id = :companyId")
    Double getAverageRatingByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT AVG(f.rating) FROM Feedback f WHERE f.agent.id = :agentId")
    Double getAverageRatingByAgentId(@Param("agentId") Long agentId);

    @Query("SELECT AVG(f.rating) FROM Feedback f")
    Double getGlobalAverageRating();

    long countByCompanyId(Long companyId);

    long countByAgentId(Long agentId);

    long countByCompanyIdAndRating(Long companyId, Integer rating);

    long countByRating(Integer rating);
}
