package com.ticketpro.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a user attempts to access or modify a resource belonging to another tenant.
 * This is a hard security boundary violation — the request is rejected with HTTP 403.
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class TenantAccessDeniedException extends RuntimeException {

    public TenantAccessDeniedException(String message) {
        super(message);
    }

    public TenantAccessDeniedException(String resourceType, Object resourceId) {
        super("Access denied: You do not have permission to access " + resourceType + " with id " + resourceId + " — it belongs to another tenant.");
    }
}
