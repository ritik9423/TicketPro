package com.ticketpro.api.controller;

import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.dto.TicketHistoryResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.TicketHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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

/**
 * Enterprise Ticket Audit & Lifecycle History Controller.
 * Provides immutable field-change changelogs, status transitions, and assignment history.
 */
@RestController
@RequestMapping(path = {"/api/v1/tickets/{ticketId}/history", "/api/tickets/{ticketId}/history"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Ticket History", description = "Endpoints for inspecting audit history and state transition logs of tickets.")
public class TicketHistoryController {

    private final TicketHistoryService ticketHistoryService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get ticket lifecycle changelog",
            description = "Retrieves a paginated audit history of modifications, status changes, and priority updates on the ticket."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ticket history retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid ticket ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content),
            @ApiResponse(responseCode = "404", description = "Ticket not found", content = @Content)
    })
    public ResponseEntity<PagedResponse<TicketHistoryResponse>> getTicketHistory(
            @Parameter(description = "ID of the ticket", required = true, example = "101")
            @PathVariable("ticketId")
            @Positive(message = "Ticket ID must be a positive integer") Long ticketId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PagedResponse<TicketHistoryResponse> history = ticketHistoryService.getHistoryByTicketPaged(ticketId, userDetails, pageable);
        return ResponseEntity.ok(history);
    }
}
