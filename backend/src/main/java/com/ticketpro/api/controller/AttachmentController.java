package com.ticketpro.api.controller;

import com.ticketpro.api.dto.AttachmentDownload;
import com.ticketpro.api.dto.AttachmentResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.AttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

/**
 * Enterprise-grade REST Controller for ticket file attachment uploads, downloads, and lifecycle management.
 * Injects strictly the {@link AttachmentService} with zero repository dependencies.
 */
@RestController
@RequestMapping(path = {"/api/v1", "/api"})
@Validated
@Tag(name = "Attachments", description = "Endpoints for managing ticket attachments, standalone document uploads, and secure file streaming")
@SecurityRequirement(name = "bearerAuth")
public class AttachmentController {

    private final AttachmentService attachmentService;

    @org.springframework.beans.factory.annotation.Autowired
    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    public AttachmentController(AttachmentService attachmentService, com.ticketpro.api.repository.UserRepository userRepository, com.ticketpro.api.repository.TicketRepository ticketRepository) {
        this(attachmentService);
    }

    @Operation(summary = "Upload standalone or ticket-associated file", 
               description = "Uploads a file optionally associated with a ticket identifier or stored as a standalone attachment.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Attachment uploaded successfully",
                    content = @Content(schema = @Schema(implementation = AttachmentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Disallowed file extension or size exceeding 10MB limit"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - authentication required")
    })
    @PostMapping(value = "/attachments/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AttachmentResponse> uploadStandaloneAttachment(
            @Parameter(description = "Multipart file to upload", required = true)
            @RequestParam("file") MultipartFile file,
            @Parameter(description = "Optional ticket ID or reference number")
            @RequestParam(value = "ticketId", required = false) String ticketId,
            @Parameter(description = "Optional uploader email override")
            @RequestParam(value = "uploaderEmail", required = false) String uploaderEmail,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AttachmentResponse response = attachmentService.uploadStandaloneAttachmentDto(file, ticketId, uploaderEmail, userDetails);
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/attachments/{id}/download")
                .buildAndExpand(response.getId() != null ? response.getId() : 0L)
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Operation(summary = "Upload attachment for a specific ticket", 
               description = "Uploads a document or image attached directly to a support ticket.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Attachment uploaded successfully",
                    content = @Content(schema = @Schema(implementation = AttachmentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid file or extension"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    @PostMapping(value = "/tickets/{ticketId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AttachmentResponse> uploadAttachment(
            @Parameter(description = "Ticket ID or ticket reference number", required = true)
            @PathVariable("ticketId") String ticketId,
            @Parameter(description = "Multipart file to upload", required = true)
            @RequestParam("file") MultipartFile file,
            @Parameter(description = "Optional uploader email")
            @RequestParam(value = "uploaderEmail", required = false) String uploaderEmail,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AttachmentResponse response = attachmentService.uploadAttachmentDto(ticketId, file, uploaderEmail, userDetails);
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/attachments/{id}/download")
                .buildAndExpand(response.getId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Operation(summary = "List attachments for a ticket", 
               description = "Returns a paginated list of attachments associated with the given ticket.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Attachments retrieved successfully",
                    content = @Content(schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden - cross-tenant access prohibited")
    })
    @GetMapping("/tickets/{ticketId}/attachments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PagedResponse<AttachmentResponse>> getAttachments(
            @Parameter(description = "Ticket ID or ticket reference number", required = true)
            @PathVariable("ticketId") String ticketId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<AttachmentResponse> attPage = attachmentService.getAttachmentsForTicketPagedDto(ticketId, userDetails, pageable);
        return ResponseEntity.ok(PagedResponse.from(attPage));
    }

    @Operation(summary = "Download attachment by ID", 
               description = "Streams the attachment resource verified against tenant ownership rules.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "File resource stream"),
            @ApiResponse(responseCode = "403", description = "Forbidden - unauthorized access to file"),
            @ApiResponse(responseCode = "404", description = "Attachment not found")
    })
    @GetMapping("/attachments/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> downloadAttachmentById(
            @Parameter(description = "Attachment ID", required = true)
            @PathVariable("id") @Positive(message = "Attachment ID must be positive") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AttachmentDownload download = attachmentService.downloadAttachmentById(id, userDetails);
        return serveResource(download);
    }

    // Legacy test-compatibility overload
    public ResponseEntity<Resource> downloadAttachmentById(Long id, CustomUserDetails userDetails, jakarta.servlet.http.HttpServletRequest request) {
        com.ticketpro.api.entity.Attachment attachment = attachmentService.getAttachmentById(id);
        if (attachment == null) {
            throw new com.ticketpro.api.exception.ResourceNotFoundException("Attachment not found with id: " + id);
        }
        verifyAttachmentAccess(attachment, userDetails);
        String storedFileName = attachment.getFileUrl();
        if (storedFileName != null && storedFileName.contains("/")) {
            storedFileName = storedFileName.substring(storedFileName.lastIndexOf('/') + 1);
        }
        Resource resource = attachmentService.loadFileAsResource(storedFileName != null ? storedFileName : attachment.getFileName());
        String contentType = null;
        if (request != null && request.getServletContext() != null) {
            try {
                contentType = request.getServletContext().getMimeType(storedFileName);
            } catch (Exception ignored) {}
        }
        return serveResource(new AttachmentDownload(resource, attachment.getFileName(), contentType != null ? contentType : "application/octet-stream"));
    }

    private void verifyAttachmentAccess(com.ticketpro.api.entity.Attachment attachment, CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("Authentication required to access attachments.");
        }
        if (userDetails.getRole() == com.ticketpro.api.entity.Role.SUPER_ADMIN) {
            return;
        }

        com.ticketpro.api.entity.Ticket ticket = attachment.getTicket();
        if (ticket == null) {
            if (attachment.getUploadedBy() != null) {
                if (attachment.getUploadedBy().getId().equals(userDetails.getId())) {
                    return;
                }
                if (attachment.getUploadedBy().getCompany() != null &&
                        attachment.getUploadedBy().getCompany().getId().equals(userDetails.getCompanyId())) {
                    return;
                }
            }
            throw new SecurityException("Access denied: You do not have permission to access this file.");
        }

        Long ticketCompanyId = ticket.getCompany() != null ? ticket.getCompany().getId() : null;
        if (ticketCompanyId != null && !ticketCompanyId.equals(userDetails.getCompanyId())) {
            throw new SecurityException("Access denied: You cannot access attachments belonging to another organization.");
        }

        com.ticketpro.api.entity.Role userRole = userDetails.getRole();
        if (userRole == com.ticketpro.api.entity.Role.COMPANY_ADMIN || userRole == com.ticketpro.api.entity.Role.MANAGER || userRole == com.ticketpro.api.entity.Role.AGENT) {
            return;
        }

        if (userRole == com.ticketpro.api.entity.Role.END_USER) {
            if (ticket.getCreatedBy() != null && ticket.getCreatedBy().getId().equals(userDetails.getId())) {
                return;
            }
            throw new SecurityException("Access denied: You can only access attachments from your own tickets.");
        }

        throw new SecurityException("Access denied: Insufficient permissions to access attachment.");
    }

    @Operation(summary = "Download attachment by stored filename", 
               description = "Streams the attachment matching the unique stored filename.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "File resource stream"),
            @ApiResponse(responseCode = "403", description = "Forbidden - access denied"),
            @ApiResponse(responseCode = "404", description = "Attachment not found")
    })
    @GetMapping("/attachments/download/{fileName:.+}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> downloadAttachment(
            @Parameter(description = "Unique stored file name", required = true)
            @PathVariable("fileName") String fileName,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        AttachmentDownload download = attachmentService.downloadAttachmentByFileName(fileName, userDetails);
        return serveResource(download);
    }

    @Operation(summary = "Delete an attachment", 
               description = "Deletes an attachment from physical disk and database record.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Attachment deleted successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden - unauthorized deletion"),
            @ApiResponse(responseCode = "404", description = "Attachment not found")
    })
    @DeleteMapping("/attachments/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteAttachment(
            @Parameter(description = "ID of the attachment to delete", required = true)
            @PathVariable("id") @Positive(message = "Attachment ID must be positive") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        attachmentService.deleteAttachmentDto(id, userDetails);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<Resource> serveResource(AttachmentDownload download) {
        String contentType = download.contentType() != null ? download.contentType() : "application/octet-stream";
        String downloadName = download.fileName() != null ? download.fileName() : "download";

        // SECURITY H-5: Block SVG from inline rendering (prevents stored XSS attacks)
        boolean isSvg = contentType.contains("svg") || downloadName.toLowerCase().endsWith(".svg");
        boolean isInline = !isSvg && (contentType.startsWith("image/") || contentType.equals("application/pdf"));
        String disposition = (isInline ? "inline" : "attachment") + "; filename=\"" + downloadName + "\"";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header("X-Content-Type-Options", "nosniff")
                .body(download.resource());
    }
}
