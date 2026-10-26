package com.ticketpro.api.controller;

import com.ticketpro.api.dto.NotificationActionResponse;
import com.ticketpro.api.dto.NotificationEmailRequest;
import com.ticketpro.api.dto.NotificationEmailResponse;
import com.ticketpro.api.dto.NotificationResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.dto.UnreadCountResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

/**
 * Enterprise-grade REST Controller for managing user notifications and system dispatch.
 */
@RestController
@RequestMapping(path = {"/api/v1/notifications", "/api/notifications"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Notifications", description = "Endpoints for managing user notifications, unread counts, and email dispatches")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Send email notification and store in-app notification", 
               description = "Dispatches a physical email via SMTP and stores a persistent in-app notification. Restricted to SUPER_ADMIN and COMPANY_ADMIN.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Notification dispatched and persisted successfully",
                    content = @Content(schema = @Schema(implementation = NotificationEmailResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid notification parameters provided"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient role permissions")
    })
    @PostMapping("/email")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<NotificationEmailResponse> sendEmailNotification(
            @Valid @RequestBody NotificationEmailRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        NotificationEmailResponse response = notificationService.sendEmailNotification(request, userDetails);
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/notifications/{id}")
                .buildAndExpand(response.getNotificationId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Operation(summary = "Retrieve paginated notifications for the authenticated user",
               description = "Returns a paginated list of scoped notifications based on the current user's role and organization.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Notifications retrieved successfully",
                    content = @Content(schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - authentication required")
    })
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PagedResponse<NotificationResponse>> getUserNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<NotificationResponse> notifPage = notificationService.getScopedNotificationsDtoPaged(userDetails, pageable);
        return ResponseEntity.ok(PagedResponse.from(notifPage));
    }

    @Operation(summary = "Get unread notifications count", 
               description = "Retrieves the total count of unread notifications scoped to the current user.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Unread count retrieved successfully",
                    content = @Content(schema = @Schema(implementation = UnreadCountResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - authentication required")
    })
    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UnreadCountResponse countResponse = notificationService.getScopedUnreadCountDto(userDetails);
        return ResponseEntity.ok(countResponse);
    }

    @Operation(summary = "Mark a notification as read", 
               description = "Marks a specific notification as read by its unique identifier.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Notification marked as read successfully",
                    content = @Content(schema = @Schema(implementation = NotificationActionResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid notification ID provided"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @RequestMapping(value = "/{id}/read", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationActionResponse> markAsRead(
            @Parameter(description = "ID of the notification", required = true)
            @PathVariable("id") @Positive(message = "Notification ID must be positive") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        NotificationActionResponse response = notificationService.markAsReadDto(id, userDetails);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Mark all notifications as read", 
               description = "Marks all unread notifications scoped to the current user as read.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "All notifications marked as read",
                    content = @Content(schema = @Schema(implementation = NotificationActionResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - authentication required")
    })
    @RequestMapping(value = "/read-all", method = {RequestMethod.PUT, RequestMethod.PATCH})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationActionResponse> markAllAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        NotificationActionResponse response = notificationService.markAllAsReadDto(userDetails);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Delete a notification", 
               description = "Deletes a specific notification belonging to the user's workspace.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Notification deleted successfully",
                    content = @Content(schema = @Schema(implementation = NotificationActionResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid notification ID"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationActionResponse> deleteNotification(
            @Parameter(description = "ID of the notification to delete", required = true)
            @PathVariable("id") @Positive(message = "Notification ID must be positive") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        NotificationActionResponse response = notificationService.deleteNotificationDto(id, userDetails);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Clear all notifications", 
               description = "Permanently deletes all notifications scoped to the authenticated user.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "All notifications cleared successfully",
                    content = @Content(schema = @Schema(implementation = NotificationActionResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - authentication required")
    })
    @DeleteMapping("/clear-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationActionResponse> clearAllNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        NotificationActionResponse response = notificationService.clearAllNotificationsDto(userDetails);
        return ResponseEntity.ok(response);
    }
}
