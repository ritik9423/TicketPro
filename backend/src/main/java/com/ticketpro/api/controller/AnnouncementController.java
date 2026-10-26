package com.ticketpro.api.controller;

import com.ticketpro.api.dto.AnnouncementRequest;
import com.ticketpro.api.dto.AnnouncementResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.AnnouncementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

/**
 * Enterprise Multi-Tenant Announcement Controller.
 * Manages broadcast bulletins, maintenance notices, and organizational alerts.
 * Strictly adheres to Single Responsibility Principle, delegating all domain
 * and tenant-resolution logic to {@link AnnouncementService}.
 */
@RestController
@RequestMapping(path = {"/api/v1/announcements", "/api/announcements"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Announcements", description = "Enterprise multi-tenant announcement management: broadcast bulletins, maintenance notices, and alerts.")
public class AnnouncementController {

    private final AnnouncementService announcementService;

    /**
     * Retrieve all announcements with tenant isolation and standard pagination.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get paginated announcements",
            description = "Retrieves announcements strictly scoped to caller's tenant. Super Admins can optionally filter across tenants using companyId."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Announcements retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Page.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters or pagination arguments", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content)
    })
    public ResponseEntity<Page<AnnouncementResponse>> getAnnouncements(
            @Parameter(description = "Optional company ID filter (Super Admins only)", example = "1")
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Page<AnnouncementResponse> announcements = announcementService.getAnnouncements(companyId, pageable, userDetails);
        return ResponseEntity.ok(announcements);
    }

    /**
     * Retrieve active announcements for alert banners with tenant isolation.
     */
    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get active announcements",
            description = "Retrieves active broadcast bulletins and system alerts scoped to the caller's tenant."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Active announcements retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = Page.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request parameters", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content)
    })
    public ResponseEntity<Page<AnnouncementResponse>> getActiveAnnouncements(
            @Parameter(description = "Optional company ID filter (Super Admins only)", example = "1")
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Page<AnnouncementResponse> activeAnnouncements = announcementService.getActiveAnnouncements(companyId, pageable, userDetails);
        return ResponseEntity.ok(activeAnnouncements);
    }

    /**
     * Retrieve a specific announcement by ID with tenant verification.
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get announcement by ID",
            description = "Retrieves details of a specific announcement by its ID, enforcing tenant boundaries."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Announcement retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = AnnouncementResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "Announcement not found", content = @Content)
    })
    public ResponseEntity<AnnouncementResponse> getAnnouncementById(
            @Parameter(description = "Unique ID of the announcement", required = true, example = "42")
            @PathVariable("id")
            @Positive(message = "Announcement ID must be a positive integer") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AnnouncementResponse announcement = announcementService.getAnnouncementById(id, userDetails);
        return ResponseEntity.ok(announcement);
    }

    /**
     * Create a new announcement. Restricted to Super Admin, Company Admin, and Manager.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    @Operation(
            summary = "Create an announcement",
            description = "Publishes a new bulletin or organizational alert. Automatically associated with caller's company unless Super Admin."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Announcement created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = AnnouncementResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed for request body", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions or unassociated tenant", content = @Content),
            @ApiResponse(responseCode = "404", description = "Target company not found", content = @Content)
    })
    public ResponseEntity<AnnouncementResponse> createAnnouncement(
            @Valid @RequestBody AnnouncementRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AnnouncementResponse created = announcementService.createAnnouncement(request, userDetails);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    /**
     * Update an existing announcement with strict tenant verification.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    @Operation(
            summary = "Update an announcement",
            description = "Modifies an existing announcement. Verifies that non-Super Admin callers belong to the owning organization."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Announcement updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = AnnouncementResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or invalid ID", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "Announcement not found", content = @Content)
    })
    public ResponseEntity<AnnouncementResponse> updateAnnouncement(
            @Parameter(description = "Unique ID of the announcement to update", required = true, example = "42")
            @PathVariable("id")
            @Positive(message = "Announcement ID must be a positive integer") Long id,
            @Valid @RequestBody AnnouncementRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AnnouncementResponse updated = announcementService.updateAnnouncement(id, request, userDetails);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete an announcement permanently with strict tenant verification.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    @Operation(
            summary = "Delete an announcement",
            description = "Deletes an announcement permanently. Ensures tenant boundary rules are strictly observed."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Announcement deleted successfully (no content)"),
            @ApiResponse(responseCode = "400", description = "Invalid ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "Announcement not found", content = @Content)
    })
    public ResponseEntity<Void> deleteAnnouncement(
            @Parameter(description = "Unique ID of the announcement to delete", required = true, example = "42")
            @PathVariable("id")
            @Positive(message = "Announcement ID must be a positive integer") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        announcementService.deleteAnnouncement(id, userDetails);
        return ResponseEntity.noContent().build();
    }
}
