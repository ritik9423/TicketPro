package com.ticketpro.api.controller;

import com.ticketpro.api.dto.AnnouncementRequest;
import com.ticketpro.api.dto.AnnouncementResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.AnnouncementService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Enterprise Multi-Tenant Announcement Controller.
 * Manages broadcast bulletins, maintenance notices, and organizational alerts.
 * Features strict tenant segregation, DTO isolation, and optional server-side pagination.
 */
@RestController
@RequestMapping("/api/announcements")
public class AnnouncementController {

    private final AnnouncementService announcementService;
    private final CompanyRepository companyRepository;

    public AnnouncementController(AnnouncementService announcementService, CompanyRepository companyRepository) {
        this.announcementService = announcementService;
        this.companyRepository = companyRepository;
    }

    /**
     * Retrieve all announcements with strict tenant isolation and optional server-side pagination.
     */
    @GetMapping
    public ResponseEntity<?> getAnnouncements(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @RequestParam(name = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(name = "direction", defaultValue = "desc") String direction,
            @RequestParam(name = "companyId", required = false) Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long effectiveCompanyId = resolveEffectiveCompanyId(userDetails, companyId);

        if (page != null && size != null && size > 0) {
            Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
            int pageIndex = Math.max(0, page);
            int pageSize = size;
            Pageable pageable = PageRequest.of(pageIndex, pageSize, sort);
            Page<AnnouncementResponse> pagedResult = announcementService.getAnnouncementsPaged(effectiveCompanyId, pageable);
            return ResponseEntity.ok(pagedResult);
        }

        List<AnnouncementResponse> listResult = announcementService.getAnnouncementsList(effectiveCompanyId);
        return ResponseEntity.ok(listResult);
    }

    /**
     * Retrieve active announcements for alert banners with tenant isolation and optional pagination.
     */
    @GetMapping("/active")
    public ResponseEntity<?> getActiveAnnouncements(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @RequestParam(name = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(name = "direction", defaultValue = "desc") String direction,
            @RequestParam(name = "companyId", required = false) Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long effectiveCompanyId = resolveEffectiveCompanyId(userDetails, companyId);

        if (page != null && size != null && size > 0) {
            Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
            int pageIndex = Math.max(0, page);
            int pageSize = size;
            Pageable pageable = PageRequest.of(pageIndex, pageSize, sort);
            Page<AnnouncementResponse> pagedResult = announcementService.getActiveAnnouncementsPaged(effectiveCompanyId, pageable);
            return ResponseEntity.ok(pagedResult);
        }

        List<AnnouncementResponse> listResult = announcementService.getActiveAnnouncementsList(effectiveCompanyId);
        return ResponseEntity.ok(listResult);
    }

    /**
     * Create a new announcement (Super Admin, Company Admin, Manager).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    public ResponseEntity<AnnouncementResponse> createAnnouncement(
            @Valid @RequestBody AnnouncementRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User creator = userDetails.getUser();
        boolean isSuperAdmin = userDetails.getRole() == Role.SUPER_ADMIN;
        Company targetCompany;

        Long targetCompId = request.getTargetCompanyId();
        if (isSuperAdmin && targetCompId != null) {
            targetCompany = companyRepository.findById(targetCompId)
                    .orElseThrow(() -> new IllegalArgumentException("Target company not found with id: " + targetCompId));
        } else if (creator != null && creator.getCompany() != null) {
            targetCompany = creator.getCompany();
        } else if (isSuperAdmin) {
            targetCompany = null; // Global system-wide announcement
        } else {
            throw new SecurityException("Tenant user must be associated with a valid company to create announcements.");
        }

        AnnouncementResponse created = announcementService.createAnnouncement(request, targetCompany, creator);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update an existing announcement with strict tenant verification.
     * Clean error handling: SecurityException and IllegalArgumentException bubble up to GlobalExceptionHandler.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    public ResponseEntity<AnnouncementResponse> updateAnnouncement(
            @PathVariable("id") Long id,
            @Valid @RequestBody AnnouncementRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean isSuperAdmin = userDetails.getRole() == Role.SUPER_ADMIN;
        Long companyId = isSuperAdmin ? null : userDetails.getCompanyId();

        AnnouncementResponse updated = announcementService.updateAnnouncement(id, request, companyId, isSuperAdmin);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete an announcement with strict tenant verification.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    public ResponseEntity<Void> deleteAnnouncement(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean isSuperAdmin = userDetails.getRole() == Role.SUPER_ADMIN;
        Long companyId = isSuperAdmin ? null : userDetails.getCompanyId();

        announcementService.deleteAnnouncement(id, companyId, isSuperAdmin);
        return ResponseEntity.noContent().build();
    }

    /**
     * Enforce strict tenant boundaries.
     * Non-SUPER_ADMIN users can NEVER inspect announcements of other tenants.
     */
    private Long resolveEffectiveCompanyId(CustomUserDetails userDetails, Long requestedCompanyId) {
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            return requestedCompanyId;
        }

        Long tenantCompanyId = userDetails.getCompanyId();
        if (tenantCompanyId == null) {
            throw new SecurityException("Access denied: User account is not assigned to any active organization tenant.");
        }
        return tenantCompanyId;
    }
}
