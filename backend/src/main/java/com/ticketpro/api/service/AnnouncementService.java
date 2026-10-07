package com.ticketpro.api.service;

import com.ticketpro.api.dto.AnnouncementRequest;
import com.ticketpro.api.dto.AnnouncementResponse;
import com.ticketpro.api.entity.Announcement;
import com.ticketpro.api.entity.AnnouncementStatus;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.AnnouncementRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;

    public AnnouncementService(AnnouncementRepository announcementRepository) {
        this.announcementRepository = announcementRepository;
    }

    // ==========================================
    // PAGINATED DTO QUERIES (FOR PRODUCTION API)
    // ==========================================

    @Transactional(readOnly = true)
    public Page<AnnouncementResponse> getAnnouncementsPaged(Long companyId, Pageable pageable) {
        if (companyId == null) {
            return announcementRepository.findAllByOrderByCreatedAtDesc(pageable)
                    .map(AnnouncementResponse::fromEntity);
        }
        return announcementRepository.findByCompanyIdOrderByCreatedAtDesc(companyId, pageable)
                .map(AnnouncementResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<AnnouncementResponse> getActiveAnnouncementsPaged(Long companyId, Pageable pageable) {
        if (companyId == null) {
            return announcementRepository.findByStatusOrderByCreatedAtDesc(AnnouncementStatus.ACTIVE, pageable)
                    .map(AnnouncementResponse::fromEntity);
        }
        return announcementRepository.findByCompanyIdAndStatusOrderByCreatedAtDesc(companyId, AnnouncementStatus.ACTIVE, pageable)
                .map(AnnouncementResponse::fromEntity);
    }

    // ==========================================
    // UNPAGED DTO LISTS (BACKWARD COMPATIBILITY)
    // ==========================================

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> getAnnouncementsList(Long companyId) {
        List<Announcement> announcements = (companyId == null)
                ? announcementRepository.findAllByOrderByCreatedAtDesc()
                : announcementRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);

        return announcements.stream()
                .map(AnnouncementResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AnnouncementResponse> getActiveAnnouncementsList(Long companyId) {
        List<Announcement> announcements = (companyId == null)
                ? announcementRepository.findByStatusOrderByCreatedAtDesc(AnnouncementStatus.ACTIVE)
                : announcementRepository.findByCompanyIdAndStatusOrderByCreatedAtDesc(companyId, AnnouncementStatus.ACTIVE);

        return announcements.stream()
                .map(AnnouncementResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ==========================================
    // ENTITY HELPERS & DASHBOARD SERVICE COMPAT
    // ==========================================

    public Announcement getAnnouncementById(Long id) {
        return announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found with id: " + id));
    }

    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<Announcement> getAllActiveAnnouncements() {
        return announcementRepository.findByStatusOrderByCreatedAtDesc(AnnouncementStatus.ACTIVE);
    }

    public List<Announcement> getAllAnnouncementsByCompany(Long companyId) {
        if (companyId == null) return getAllAnnouncements();
        return announcementRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }

    public List<Announcement> getActiveAnnouncementsByCompany(Long companyId) {
        if (companyId == null) return getAllActiveAnnouncements();
        return announcementRepository.findByCompanyIdAndStatusOrderByCreatedAtDesc(companyId, AnnouncementStatus.ACTIVE);
    }

    // ==========================================
    // MUTATIONS WITH STRICT TENANT SECURITY
    // ==========================================

    @Transactional
    public AnnouncementResponse createAnnouncement(AnnouncementRequest request, Company company, User creator) {
        Announcement announcement = new Announcement();
        announcement.setCompany(company);
        announcement.setTitle(request.getTitle());
        announcement.setMessage(request.getMessage());
        announcement.setStatus(request.getStatus() != null ? request.getStatus() : AnnouncementStatus.ACTIVE);
        announcement.setCreatedBy(creator);

        Announcement saved = announcementRepository.save(announcement);
        return AnnouncementResponse.fromEntity(saved);
    }

    @Transactional
    public AnnouncementResponse updateAnnouncement(Long id, AnnouncementRequest request, Long companyId, boolean isSuperAdmin) {
        Announcement announcement = getAnnouncementById(id);

        // Strict Tenant Verification
        if (!isSuperAdmin) {
            if (companyId == null || announcement.getCompany() == null || !announcement.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Access Denied: You cannot modify announcements belonging to another organization.");
            }
        }

        announcement.setTitle(request.getTitle());
        announcement.setMessage(request.getMessage());
        if (request.getStatus() != null) {
            announcement.setStatus(request.getStatus());
        }

        Announcement saved = announcementRepository.save(announcement);
        return AnnouncementResponse.fromEntity(saved);
    }

    // Overload for backward compatibility
    @Transactional
    public Announcement updateAnnouncement(Long id, AnnouncementRequest request, Long companyId) {
        Announcement announcement = getAnnouncementById(id);
        if (companyId != null && announcement.getCompany() != null && !announcement.getCompany().getId().equals(companyId)) {
            throw new SecurityException("Access Denied: Unauthorized Announcement modification.");
        }
        announcement.setTitle(request.getTitle());
        announcement.setMessage(request.getMessage());
        if (request.getStatus() != null) {
            announcement.setStatus(request.getStatus());
        }
        return announcementRepository.save(announcement);
    }

    @Transactional
    public void deleteAnnouncement(Long id, Long companyId, boolean isSuperAdmin) {
        Announcement announcement = getAnnouncementById(id);

        // Strict Tenant Verification
        if (!isSuperAdmin) {
            if (companyId == null || announcement.getCompany() == null || !announcement.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Access Denied: You cannot delete announcements belonging to another organization.");
            }
        }

        announcementRepository.delete(announcement);
    }

    // Overload for backward compatibility
    @Transactional
    public void deleteAnnouncement(Long id, Long companyId) {
        deleteAnnouncement(id, companyId, false);
    }
}
