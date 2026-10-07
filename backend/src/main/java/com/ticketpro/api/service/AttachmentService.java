package com.ticketpro.api.service;

import com.ticketpro.api.entity.Attachment;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.AttachmentRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final Path fileStorageLocation;

    @Autowired(required = false)
    private TicketHistoryService ticketHistoryService;

    // Strict 10MB file size limit
    public static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024; // 10MB

    // SECURITY H-5: Strict allowlist of safe document and image formats
    private static final Set<String> ALLOWED_EXTENSIONS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv",
            ".rtf", ".odt", ".ods", ".odp", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"
    )));

    private void validateUploadedFile(String originalFileName, String contentType) {
        String fileExtension = "";
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex > 0) {
            fileExtension = originalFileName.substring(dotIndex).toLowerCase();
        }

        if (fileExtension.isEmpty() || !ALLOWED_EXTENSIONS.contains(fileExtension)) {
            throw new IllegalArgumentException("File type '" + fileExtension + "' is not permitted. Allowed formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, RTF, PNG, JPG, JPEG, GIF, WEBP, BMP.");
        }

        if (contentType != null) {
            String lowerType = contentType.toLowerCase().trim();
            if (lowerType.contains("svg") || lowerType.contains("html") || lowerType.contains("javascript") || lowerType.startsWith("video/")) {
                throw new IllegalArgumentException("Dangerous MIME type '" + contentType + "' is not permitted.");
            }
        }
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AttachmentService(AttachmentRepository attachmentRepository, TicketRepository ticketRepository, UserRepository userRepository) {
        this.attachmentRepository = attachmentRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.fileStorageLocation = Paths.get("uploads/attachments").toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
            // Also ensure fallback directories exist
            try { Files.createDirectories(Paths.get("../uploads/attachments").toAbsolutePath().normalize()); } catch (Exception ignored) {}
            try { Files.createDirectories(Paths.get("backend/uploads/attachments").toAbsolutePath().normalize()); } catch (Exception ignored) {}
        } catch (Exception ex) {
            log.error("Could not create attachments directory", ex);
        }
    }

    @Transactional
    public Attachment uploadAttachment(Long ticketId, MultipartFile file, User currentUser, Long companyId, Role role) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + ticketId));

        if (currentUser == null) {
            currentUser = ticket.getCreatedBy();
        }

        if (currentUser == null) {
            throw new SecurityException("Authenticated user context is required to upload attachments.");
        }

        // SECURITY: Strict multi-tenant attachment upload enforcement
        if (role != Role.SUPER_ADMIN && companyId != null && ticket.getCompany() != null) {
            if (!ticket.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Access denied: Cross-tenant attachment upload is strictly forbidden. " +
                        "You cannot upload files to tickets belonging to another company.");
            }
        }

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file.");
        }

        // 1. Enforce 10MB maximum file size limit
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds 10MB limit. Maximum allowed size is 10MB.");
        }

        String rawFileName = file.getOriginalFilename();
        String originalFileName = (rawFileName != null) ? rawFileName : "file";
        String rawContentType = file.getContentType();
        String contentType = (rawContentType != null) ? rawContentType.toLowerCase().trim() : "";
        validateUploadedFile(originalFileName, contentType);

        String fileExtension = "";
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex > 0) {
            fileExtension = originalFileName.substring(dotIndex).toLowerCase();
        }

        String uniqueFileName = UUID.randomUUID().toString() + fileExtension;
        Path targetLocation = this.fileStorageLocation.resolve(uniqueFileName);

        try {
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Mirror copy to both root and backend uploads to ensure persistence across all working dirs
            try {
                Path mirror1 = Paths.get("../uploads/attachments").toAbsolutePath().normalize().resolve(uniqueFileName);
                if (Files.exists(mirror1.getParent())) {
                    Files.copy(targetLocation, mirror1, StandardCopyOption.REPLACE_EXISTING);
                }
            } catch (Exception ignored) {}
            try {
                Path mirror2 = Paths.get("backend/uploads/attachments").toAbsolutePath().normalize().resolve(uniqueFileName);
                if (Files.exists(mirror2.getParent())) {
                    Files.copy(targetLocation, mirror2, StandardCopyOption.REPLACE_EXISTING);
                }
            } catch (Exception ignored) {}
        } catch (IOException e) {
            log.error("Failed to store file {}", originalFileName, e);
            throw new RuntimeException("Could not store file. Please try again!");
        }

        String fileUrl = "/api/attachments/download/" + uniqueFileName;

        Attachment attachment = new Attachment(
                ticket,
                currentUser,
                originalFileName,
                fileUrl,
                file.getContentType(),
                file.getSize()
        );

        Attachment saved = attachmentRepository.save(attachment);
        log.info("Attachment uploaded successfully: {} for ticket #{}", originalFileName, ticket.getTicketNumber());

        if (ticketHistoryService != null) {
            try {
                ticketHistoryService.recordChange(ticket, "ATTACHMENT_ADDED", "attachment", null, originalFileName, currentUser);
            } catch (Exception e) {
                log.warn("Could not record attachment upload history: {}", e.getMessage());
            }
        }

        return saved;
    }

    /**
     * Standalone file upload for interactive form builders and draft tickets.
     */
    public Map<String, Object> uploadStandaloneFile(MultipartFile file, User currentUser) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds 10MB limit. Maximum allowed size is 10MB.");
        }

        String rawFileName = file.getOriginalFilename();
        String originalFileName = (rawFileName != null) ? rawFileName : "file";
        String rawContentType = file.getContentType();
        String contentType = (rawContentType != null) ? rawContentType.toLowerCase().trim() : "";
        validateUploadedFile(originalFileName, contentType);

        String fileExtension = "";
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex > 0) {
            fileExtension = originalFileName.substring(dotIndex).toLowerCase();
        }

        String uniqueFileName = UUID.randomUUID().toString() + fileExtension;
        Path targetLocation = this.fileStorageLocation.resolve(uniqueFileName);

        try {
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            try {
                Path mirror1 = Paths.get("../uploads/attachments").toAbsolutePath().normalize().resolve(uniqueFileName);
                if (Files.exists(mirror1.getParent())) {
                    Files.copy(targetLocation, mirror1, StandardCopyOption.REPLACE_EXISTING);
                }
            } catch (Exception ignored) {}
            try {
                Path mirror2 = Paths.get("backend/uploads/attachments").toAbsolutePath().normalize().resolve(uniqueFileName);
                if (Files.exists(mirror2.getParent())) {
                    Files.copy(targetLocation, mirror2, StandardCopyOption.REPLACE_EXISTING);
                }
            } catch (Exception ignored) {}
        } catch (IOException e) {
            log.error("Failed to store standalone file {}", originalFileName, e);
            throw new RuntimeException("Could not store file. Please try again!");
        }

        String fileUrl = "/api/attachments/download/" + uniqueFileName;

        Map<String, Object> response = new HashMap<>();
        response.put("fileName", originalFileName);
        response.put("fileUrl", fileUrl);
        response.put("fileType", contentType.isBlank() ? "application/octet-stream" : contentType);
        response.put("fileSize", file.getSize());
        response.put("status", "SUCCESS");
        return response;
    }

    public List<Attachment> getAttachmentsForTicket(Long ticketId, Long companyId, Role role) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + ticketId));

        // SECURITY H-3: Enforce tenant isolation on attachment retrieval
        if (role != Role.SUPER_ADMIN) {
            if (companyId == null) {
                throw new SecurityException("Company context is required to access attachments.");
            }
            if (ticket.getCompany() != null && !ticket.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Unauthorized access to ticket attachments.");
            }
        }

        return attachmentRepository.findByTicketId(ticketId);
    }

    public org.springframework.data.domain.Page<Attachment> getAttachmentsForTicketPaged(Long ticketId, Long companyId, Role role, org.springframework.data.domain.Pageable pageable) {
        Ticket ticket = ticketRepository.findById(ticketId).orElse(null);
        if (ticket == null) return org.springframework.data.domain.Page.empty(pageable);

        if (role != Role.SUPER_ADMIN) {
            if (companyId == null) {
                throw new SecurityException("Company context is required to access attachments.");
            }
            if (ticket.getCompany() != null && !ticket.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Unauthorized access to ticket attachments.");
            }
        }

        return attachmentRepository.findByTicketId(ticketId, pageable);
    }

    public Attachment getAttachmentByFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) return null;
        // 1. Try by fileUrl containing the unique stored name
        Attachment att = attachmentRepository.findByFileUrlContaining(fileName).orElse(null);
        if (att != null) return att;

        // 2. Try by original human-readable fileName
        return attachmentRepository.findFirstByFileNameOrderByIdDesc(fileName).orElse(null);
    }

    public Attachment getAttachmentById(Long id) {
        if (id == null) return null;
        return attachmentRepository.findById(id).orElse(null);
    }

    public Resource loadFileAsResource(String fileName) {
        try {
            // SECURITY H-5: Validate path stays within the upload directory (prevents path traversal)
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            if (!filePath.startsWith(this.fileStorageLocation)) {
                throw new SecurityException("Access denied: invalid file path.");
            }
            if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
                // Check fallback directory paths if current working dir is root or backend
                Path fb1 = Paths.get("../uploads/attachments").toAbsolutePath().normalize().resolve(fileName).normalize();
                Path fb2 = Paths.get("backend/uploads/attachments").toAbsolutePath().normalize().resolve(fileName).normalize();
                Path fb3 = Paths.get("uploads/attachments").toAbsolutePath().normalize().resolve(fileName).normalize();
                Path fb1Base = Paths.get("../uploads/attachments").toAbsolutePath().normalize();
                Path fb2Base = Paths.get("backend/uploads/attachments").toAbsolutePath().normalize();
                Path fb3Base = Paths.get("uploads/attachments").toAbsolutePath().normalize();
                if (Files.exists(fb1) && Files.isReadable(fb1) && fb1.startsWith(fb1Base)) {
                    filePath = fb1;
                } else if (Files.exists(fb2) && Files.isReadable(fb2) && fb2.startsWith(fb2Base)) {
                    filePath = fb2;
                } else if (Files.exists(fb3) && Files.isReadable(fb3) && fb3.startsWith(fb3Base)) {
                    filePath = fb3;
                }
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new IllegalArgumentException("File not found: " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new IllegalArgumentException("File not found: " + fileName, ex);
        }
    }

    @Transactional
    public void deleteAttachment(Long attachmentId, Long companyId, Role role, Long userId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Attachment not found with id: " + attachmentId));

        if (role != Role.SUPER_ADMIN) {
            if (companyId != null && attachment.getTicket() != null && attachment.getTicket().getCompany() != null
                    && !attachment.getTicket().getCompany().getId().equals(companyId)) {
                throw new SecurityException("Unauthorized: Cross-tenant attachment deletion is forbidden.");
            }
            if (attachment.getUploadedBy() != null && !attachment.getUploadedBy().getId().equals(userId) && role != Role.COMPANY_ADMIN) {
                throw new SecurityException("Unauthorized to delete this attachment.");
            }
        }

        Ticket ticket = attachment.getTicket();
        String originalName = attachment.getFileName();
        User actor = (userId != null && userRepository != null) ? userRepository.findById(userId).orElse(null) : null;

        // Delete physical file
        try {
            String fileUrl = attachment.getFileUrl();
            if (fileUrl != null && fileUrl.contains("/")) {
                String storedFileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
                Path targetLocation = this.fileStorageLocation.resolve(storedFileName);
                Files.deleteIfExists(targetLocation);
                try { Files.deleteIfExists(Paths.get("../uploads/attachments").toAbsolutePath().normalize().resolve(storedFileName)); } catch (Exception ignored) {}
                try { Files.deleteIfExists(Paths.get("backend/uploads/attachments").toAbsolutePath().normalize().resolve(storedFileName)); } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            log.warn("Could not delete physical file: {}", e.getMessage());
        }

        attachmentRepository.delete(attachment);
        log.info("Attachment ID {} deleted successfully", attachmentId);

        if (ticketHistoryService != null && ticket != null) {
            try {
                ticketHistoryService.recordChange(ticket, "ATTACHMENT_REMOVED", "attachment", originalName, null, actor);
            } catch (Exception e) {
                log.warn("Could not record attachment deletion history: {}", e.getMessage());
            }
        }
    }
}
