package com.ticketpro.api.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global Enterprise Exception Handler.
 * Formats all backend errors according to RFC-7807 problem details specification
 * with ISO-8601 UTC timestamps, error categories, and human-friendly messages.
 *
 * ALL controller exceptions flow through this handler — controllers should NOT
 * catch exceptions locally or return ad-hoc Map.of("error", ...) responses.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private Map<String, Object> createErrorBody(int status, String error, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status);
        body.put("error", error);
        body.put("message", message);
        return body;
    }

    // ====================== 400 Bad Request ======================

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorBody(400, "BAD_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorBody(400, "INVALID_STATE", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String firstMsg = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("Validation failed");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorBody(400, "VALIDATION_FAILED", firstMsg));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParam(MissingServletRequestParameterException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorBody(400, "MISSING_PARAMETER", "Required parameter '" + ex.getParameterName() + "' is missing."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex) {
        log.warn("Malformed HTTP request body: {}", ex.getMessage());
        String detail = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorBody(400, "MALFORMED_REQUEST", "Request body is malformed or contains invalid JSON: " + detail));
    }

    // ====================== 401 Unauthorized ======================

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(org.springframework.security.core.AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(createErrorBody(401, "UNAUTHORIZED", "Invalid email or password"));
    }

    // ====================== 403 Forbidden ======================

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurity(SecurityException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(createErrorBody(403, "FORBIDDEN", ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(createErrorBody(403, "ACCESS_DENIED", ex.getMessage() != null ? ex.getMessage() : "You do not have permission for this resource."));
    }

    @ExceptionHandler(TenantAccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleTenantAccess(TenantAccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(createErrorBody(403, "TENANT_ACCESS_DENIED", ex.getMessage()));
    }

    // ====================== 404 Not Found ======================

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorBody(404, "NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorBody(404, "NOT_FOUND", ex.getMessage()));
    }

    // ====================== 409 Conflict ======================

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String message = "Data integrity violation. A record with this value may already exist.";
        if (ex.getMostSpecificCause() != null && ex.getMostSpecificCause().getMessage() != null) {
            String cause = ex.getMostSpecificCause().getMessage().toLowerCase();
            if (cause.contains("duplicate entry") || cause.contains("unique constraint")) {
                message = "A record with this value already exists. Please use a different value.";
            }
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(createErrorBody(409, "DATA_CONFLICT", message));
    }

    // ====================== 413 Payload Too Large ======================

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(createErrorBody(413, "PAYLOAD_TOO_LARGE",
                        "File size exceeds the maximum permitted limit (10MB). Please upload a smaller file."));
    }

    // ====================== 429 Too Many Requests ======================

    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<Map<String, Object>> handleAccountLocked(AccountLockedException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(createErrorBody(429, "ACCOUNT_LOCKED", ex.getMessage()));
    }

    // ====================== 500 Internal Server Error ======================

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        log.error("Unhandled exception caught by GlobalExceptionHandler: ", ex);
        // SECURITY M-7: Never expose internal error details to clients
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorBody(500, "INTERNAL_SERVER_ERROR", "An unexpected server error occurred. Please contact support."));
    }
}
