package com.ticketpro.api.dto;

import org.springframework.core.io.Resource;

/**
 * Encapsulates a resolved file resource, download name, and MIME type for secure streaming.
 */
public record AttachmentDownload(Resource resource, String fileName, String contentType) {
}
