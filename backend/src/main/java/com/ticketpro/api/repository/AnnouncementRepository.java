package com.ticketpro.api.repository;

import com.ticketpro.api.entity.Announcement;
import com.ticketpro.api.entity.AnnouncementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findByCompanyId(Long companyId);
    List<Announcement> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
    List<Announcement> findByCompanyIdAndStatus(Long companyId, AnnouncementStatus status);
    List<Announcement> findByCompanyIdAndStatusOrderByCreatedAtDesc(Long companyId, AnnouncementStatus status);
    List<Announcement> findAllByOrderByCreatedAtDesc();
    List<Announcement> findByStatusOrderByCreatedAtDesc(AnnouncementStatus status);

    // Server-Side Paginated Queries
    Page<Announcement> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Announcement> findByCompanyIdOrderByCreatedAtDesc(Long companyId, Pageable pageable);
    Page<Announcement> findByStatusOrderByCreatedAtDesc(AnnouncementStatus status, Pageable pageable);
    Page<Announcement> findByCompanyIdAndStatusOrderByCreatedAtDesc(Long companyId, AnnouncementStatus status, Pageable pageable);
}
