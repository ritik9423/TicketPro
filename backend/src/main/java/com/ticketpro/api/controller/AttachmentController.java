package com.ticketpro.api.controller;

import com.ticketpro.api.entity.Attachment;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.exception.ResourceNotFoundException;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.AttachmentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AttachmentController {

    private final AttachmentService attachmentService;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;

    public AttachmentController(AttachmentService attachmentService, UserRepository userRepository, TicketRepository ticketRepository) {
        this.attachmentService = attachmentService;
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
    }

    private Ticket resolveTicket(String ticketIdOrNumber) {
        if (ticketIdOrNumber == null || ticketIdOrNumber.isBlank()) return null;
        String clean = ticketIdOrNumber.trim();
        if (clean.matches("^\\d+$")) {
            try {
                java.util.Optional<Ticket> opt = ticketRepository.findById(Long.parseLong(clean));
                if (opt.isPresent()) return opt.get();
            } catch (Exception ignored) {}
        }
        java.util.Optional<Ticket> opt = ticketRepository.findByTicketNumber(clean);
        if (opt.isPresent()) return opt.get();

        if (!clean.startsWith("#")) {
            opt = ticketRepository.findByTicketNumber("#" + clean);
            if (opt.isPresent()) return opt.get();
        } else {
            opt = ticketRepository.findByTicketNumber(clean.substring(1));
            if (opt.isPresent()) return opt.get();
        }
        return null;
    }

    /**
     * Enforces ownership and tenant boundaries for downloading attachments:
     * - SUPER_ADMIN: unrestricted access
     * - COMPANY_ADMIN / AGENT / MANAGER: must belong to the same tenant company
     * - END_USER: must be the creator of the ticket
     */
    private void verifyAttachmentAccess(Attachment attachment, CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("Authentication required to download attachments.");
        }
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            return;
        }

        Ticket ticket = attachment.getTicket();
        if (ticket == null) {
            // Standalone attachment: verify uploader identity or tenant match
            if (attachment.getUploadedBy() != null) {
                if (attachment.getUploadedBy().getId().equals(userDetails.getId())) {
                    return;
                }
                if (attachment.getUploadedBy().getCompany() != null &&
                        attachment.getUploadedBy().getCompany().getId().equals(userDetails.getCompanyId())) {
                    return;
                }
            }
            throw new SecurityException("Access denied: You do not have permission to download this file.");
        }

        // Cross-tenant verification
        Long ticketCompanyId = ticket.getCompany() != null ? ticket.getCompany().getId() : null;
        if (ticketCompanyId != null && !ticketCompanyId.equals(userDetails.getCompanyId())) {
            throw new SecurityException("Access denied: You cannot download attachments belonging to another organization.");
        }

        // Role-based verification
        Role userRole = userDetails.getRole();
        if (userRole == Role.COMPANY_ADMIN || userRole == Role.MANAGER || userRole == Role.AGENT) {
            return;
        }

        if (userRole == Role.END_USER) {
            // End-user can only download attachments from tickets they created
            if (ticket.getCreatedBy() != null && ticket.getCreatedBy().getId().equals(userDetails.getId())) {
                return;
            }
            throw new SecurityException("Access denied: You can only download attachments from your own tickets.");
        }

        throw new SecurityException("Access denied: Insufficient permissions to download attachment.");
    }

    /**
     * Unified standalone and ticket file upload endpoint:
     * POST /api/attachments/upload
     */
    @PostMapping("/attachments/upload")
    public ResponseEntity<?> uploadStandaloneAttachment(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "ticketId", required = false) String ticketId,
            @RequestParam(value = "uploaderEmail", required = false) String uploaderEmail,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Authentication authentication) {

        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        Role role = userDetails != null ? userDetails.getRole() : null;
        User user = userDetails != null ? userDetails.getUser() : null;

        if (user == null && authentication != null && authentication.getName() != null && !authentication.getName().isBlank()) {
            user = userRepository.findByEmail(authentication.getName().trim().toLowerCase()).orElse(null);
        }
        if (user == null && uploaderEmail != null && !uploaderEmail.isBlank()) {
            user = userRepository.findByEmail(uploaderEmail.trim().toLowerCase()).orElse(null);
        }
        if (user != null) {
            if (companyId == null && user.getCompany() != null) {
                companyId = user.getCompany().getId();
            }
            if (role == null) {
                role = user.getRole();
            }
        }
        // SECURITY C-3: Reject unauthenticated requests instead of defaulting to SUPER_ADMIN
        if (role == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (ticketId != null && !ticketId.isBlank()) {
            Ticket ticket = resolveTicket(ticketId);
            if (ticket != null) {
                Attachment attachment = attachmentService.uploadAttachment(ticket.getId(), file, user, companyId, role);
                return ResponseEntity.status(HttpStatus.CREATED).body(com.ticketpro.api.dto.AttachmentResponse.from(attachment));
            }
        }

        Map<String, Object> result = attachmentService.uploadStandaloneFile(file, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/tickets/{ticketId}/attachments")
    public ResponseEntity<com.ticketpro.api.dto.AttachmentResponse> uploadAttachment(
            @PathVariable("ticketId") String ticketId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "uploaderEmail", required = false) String uploaderEmail,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Authentication authentication) {

        Ticket ticket = resolveTicket(ticketId);
        if (ticket == null) {
            throw new ResourceNotFoundException("Ticket not found with identifier: " + ticketId);
        }
        Long actualTicketId = ticket.getId();

        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        Role role = userDetails != null ? userDetails.getRole() : null;
        User user = userDetails != null ? userDetails.getUser() : null;

        if (user == null && authentication != null && authentication.getName() != null && !authentication.getName().isBlank()) {
            user = userRepository.findByEmail(authentication.getName().trim().toLowerCase()).orElse(null);
        }

        if (user == null && uploaderEmail != null && !uploaderEmail.isBlank()) {
            user = userRepository.findByEmail(uploaderEmail.trim().toLowerCase()).orElse(null);
        }

        if (user == null) {
            user = ticket.getCreatedBy();
        }

        if (user != null) {
            if (companyId == null && user.getCompany() != null) {
                companyId = user.getCompany().getId();
            }
            if (role == null) {
                role = user.getRole();
            }
        }

        // SECURITY C-3: Reject unauthenticated requests instead of defaulting to SUPER_ADMIN
        if (role == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Attachment attachment = attachmentService.uploadAttachment(actualTicketId, file, user, companyId, role);
        return ResponseEntity.status(HttpStatus.CREATED).body(com.ticketpro.api.dto.AttachmentResponse.from(attachment));
    }

    @GetMapping("/tickets/{ticketId}/attachments")
    public ResponseEntity<?> getAttachments(
            @PathVariable("ticketId") String ticketId,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Authentication authentication,
            org.springframework.data.domain.Pageable pageable) {

        Ticket ticket = resolveTicket(ticketId);
        if (ticket == null) {
            return ResponseEntity.ok(List.of());
        }
        Long actualTicketId = ticket.getId();

        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        Role role = userDetails != null ? userDetails.getRole() : null;

        if (companyId == null && authentication != null && authentication.getName() != null && !authentication.getName().isBlank()) {
            User user = userRepository.findByEmail(authentication.getName().trim().toLowerCase()).orElse(null);
            if (user != null) {
                if (user.getCompany() != null) companyId = user.getCompany().getId();
                role = user.getRole();
            }
        }

        // SECURITY C-3: Reject unauthenticated requests instead of defaulting to SUPER_ADMIN
        if (role == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        int pageNum = page != null ? page : 0;
        int pageSize = Math.min(size != null ? size : 20, 100);
        org.springframework.data.domain.Pageable paged = org.springframework.data.domain.PageRequest.of(pageNum, pageSize, pageable.getSort());
        org.springframework.data.domain.Page<Attachment> attPage = attachmentService.getAttachmentsForTicketPaged(actualTicketId, companyId, role, paged);
        return ResponseEntity.ok(com.ticketpro.api.dto.PagedResponse.from(attPage, com.ticketpro.api.dto.AttachmentResponse::from));
    }

    /**
     * Download attachment by attachment ID with tenant/ownership authorization:
     * GET /api/attachments/{id}/download
     */
    @GetMapping("/attachments/{id}/download")
    public ResponseEntity<?> downloadAttachmentById(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest request) {

        Attachment attachment = attachmentService.getAttachmentById(id);
        if (attachment == null) {
            throw new ResourceNotFoundException("Attachment not found with id: " + id);
        }

        verifyAttachmentAccess(attachment, userDetails);

        String storedFileName = attachment.getFileUrl();
        if (storedFileName != null && storedFileName.contains("/")) {
            storedFileName = storedFileName.substring(storedFileName.lastIndexOf('/') + 1);
        }
        return serveResource(storedFileName, attachment.getFileName(), request);
    }

    /**
     * Download attachment by stored filename with tenant/ownership authorization:
     * GET /api/attachments/download/{fileName:.+}
     */
    @GetMapping("/attachments/download/{fileName:.+}")
    public ResponseEntity<?> downloadAttachment(
            @PathVariable("fileName") String fileName,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest request) {

        Attachment attachment = attachmentService.getAttachmentByFileName(fileName);
        if (attachment == null) {
            throw new ResourceNotFoundException("Attachment not found: " + fileName);
        }

        verifyAttachmentAccess(attachment, userDetails);

        return serveResource(fileName, attachment.getFileName(), request);
    }

    private ResponseEntity<?> serveResource(String storedFileName, String downloadName, HttpServletRequest request) {
        Resource resource = attachmentService.loadFileAsResource(storedFileName);

        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ex) {
            // Default fallback
        }

        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        // SECURITY H-5: Block SVG from inline rendering (SVG can contain <script> tags)
        boolean isSvg = contentType.contains("svg") || (downloadName != null && downloadName.toLowerCase().endsWith(".svg"));
        boolean isInline = !isSvg && (contentType.startsWith("image/") || contentType.equals("application/pdf"));
        String disposition = (isInline ? "inline" : "attachment") + "; filename=\"" + downloadName + "\"";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                // SECURITY: Prevent MIME-type sniffing attacks
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    @DeleteMapping("/attachments/{id}")
    public ResponseEntity<?> deleteAttachment(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            throw new SecurityException("Authentication required to delete attachments.");
        }

        Long companyId = userDetails.getCompanyId();
        Role role = userDetails.getRole();
        Long userId = userDetails.getId();

        attachmentService.deleteAttachment(id, companyId, role, userId);
        return ResponseEntity.noContent().build();
    }
}
