package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CommentRequest;
import com.ticketpro.api.dto.CommentResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.CommentService;
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
 * Enterprise Ticket Comment Controller.
 * Provides paginated public and internal conversation streams strictly
 * segregated by tenant and role.
 */
@RestController
@RequestMapping(path = { "/api/v1/tickets/{ticketId}/comments", "/api/tickets/{ticketId}/comments" })
@RequiredArgsConstructor
@Validated
@Tag(name = "Ticket Comments", description = "Endpoints for ticket communication, internal notes, and audit interactions.")
public class CommentController {

        private final CommentService commentService;

        @GetMapping
        @PreAuthorize("isAuthenticated()")
        @Operation(summary = "Get comments for a ticket", description = "Retrieves paginated comments for the specified ticket. End users can only view non-internal comments for tickets they created.")
        @ApiResponses({
                        @ApiResponse(responseCode = "200", description = "Comments retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = PagedResponse.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid ticket ID or pagination parameters", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Ticket not found", content = @Content)
        })
        public ResponseEntity<PagedResponse<CommentResponse>> getComments(
                        @Parameter(description = "ID of the ticket", required = true, example = "101") @PathVariable("ticketId") @Positive(message = "Ticket ID must be a positive integer") Long ticketId,
                        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable,
                        @AuthenticationPrincipal CustomUserDetails userDetails) {
                PagedResponse<CommentResponse> comments = commentService.getCommentsForTicketPaged(ticketId,
                                userDetails, pageable);
                return ResponseEntity.ok(comments);
        }

        @PostMapping
        @PreAuthorize("isAuthenticated()")
        @Operation(summary = "Add a comment to a ticket", description = "Posts a customer reply or agent note. Automatically notifies participants and updates ticket last-activity timestamp.")
        @ApiResponses({
                        @ApiResponse(responseCode = "201", description = "Comment created successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = CommentResponse.class))),
                        @ApiResponse(responseCode = "400", description = "Validation failed for comment request body", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - Cannot comment on another tenant's ticket", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Ticket not found", content = @Content)
        })
        public ResponseEntity<CommentResponse> addComment(
                        @Parameter(description = "ID of the ticket to comment on", required = true, example = "101") @PathVariable("ticketId") @Positive(message = "Ticket ID must be a positive integer") Long ticketId,
                        @Valid @RequestBody CommentRequest request,
                        @AuthenticationPrincipal CustomUserDetails userDetails) {
                CommentResponse created = commentService.addComment(ticketId, request, userDetails);
                URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                                .path("/{id}")
                                .buildAndExpand(created.getId())
                                .toUri();
                return ResponseEntity.created(location).body(created);
        }
}
