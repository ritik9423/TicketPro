package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Attachment;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Attachment response DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentResponse {
    private Long id;
    private String fileName;
    private String fileUrl;
    private String fileType;
    private Long fileSize;
    private Long uploadedById;
    private String uploadedByName;
    private LocalDateTime createdAt;

    public static AttachmentResponse from(Attachment attachment) {
        if (attachment == null) return null;
        AttachmentResponse dto = new AttachmentResponse();
        dto.setId(attachment.getId());
        dto.setFileName(attachment.getFileName());
        dto.setFileUrl(attachment.getFileUrl());
        dto.setFileType(attachment.getFileType());
        dto.setFileSize(attachment.getFileSize());
        dto.setCreatedAt(attachment.getCreatedAt());
        try {
            if (attachment.getUploadedBy() != null) {
                dto.setUploadedById(attachment.getUploadedBy().getId());
                dto.setUploadedByName(attachment.getUploadedBy().getName());
            }
        } catch (Exception ignored) {}
        return dto;
    }
}
