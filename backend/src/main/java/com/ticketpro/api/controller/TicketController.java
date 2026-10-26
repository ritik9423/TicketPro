package com.ticketpro.api.controller;

import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.dto.TicketResponse;
import com.ticketpro.api.entity.Priority;
import com.ticketpro.api.entity.TicketStatus;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.FormSubmissionValueRepository;
import com.ticketpro.api.repository.UserRepository;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.TicketService;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Enterprise-grade REST Controller for support ticket lifecycle management.
 * Purely delegates business and data orchestration to {@link TicketService}.
 */
@RestController
@RequestMapping(path = {"/api/v1/tickets", "/api/tickets"})
@Validated
@Tag(name = "Tickets", description = "Endpoints for ticket creation, full-text search, triage, assignment, and status updates")
@SecurityRequirement(name = "bearerAuth")
public class TicketController {

    private final TicketService ticketService;

    @Autowired
    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    // Legacy test-compatibility constructors
    public TicketController(TicketService ticketService, CompanyRepository companyRepository) {
        this(ticketService);
    }

    public TicketController(TicketService ticketService, CompanyRepository companyRepository, UserRepository userRepository) {
        this(ticketService);
    }

    public TicketController(TicketService ticketService, CompanyRepository companyRepository, UserRepository userRepository,
                            FormSubmissionValueRepository formSubmissionValueRepository) {
        this(ticketService);
    }

    @Operation(summary = "Get paginated tickets for authenticated user",
               description = "Returns paginated tickets scoped to the user's role and workspace tenant.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Tickets retrieved successfully",
                    content = @Content(schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - authentication required")
    })
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PagedResponse<TicketResponse>> getTickets(
            @Parameter(description = "Optional company code filter for Super Admins")
            @RequestParam(value = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TicketResponse> ticketPage = ticketService.getTicketsPaged(userDetails, companyCode, pageable);
        return ResponseEntity.ok(PagedResponse.from(ticketPage));
    }

    @Operation(summary = "Get native Page of tickets", 
               description = "Returns a standard Spring Data Page of tickets.")
    @GetMapping("/page")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<TicketResponse>> getTicketsPaged(
            @Parameter(description = "Optional company code filter")
            @RequestParam(value = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TicketResponse> ticketPage = ticketService.getTicketsPaged(userDetails, companyCode, pageable);
        return ResponseEntity.ok(ticketPage);
    }

    @Operation(summary = "Search tickets with multi-criteria filters", 
               description = "Performs dynamic filtered search on tickets across statuses, priorities, dates, departments, and SLA flags.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Search results returned",
                    content = @Content(schema = @Schema(implementation = Page.class)))
    })
    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<TicketResponse>> searchTickets(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "statuses", required = false) List<TicketStatus> statuses,
            @RequestParam(value = "priorities", required = false) List<Priority> priorities,
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "assignedToId", required = false) Long assignedToId,
            @RequestParam(value = "createdById", required = false) Long createdById,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(value = "slaBreached", required = false) Boolean slaBreached,
            @RequestParam(value = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TicketResponse> result = ticketService.searchTicketsPagedDto(
                search, statuses, priorities, department,
                assignedToId, createdById, startDate, endDate, slaBreached, companyCode, userDetails, pageable
        );
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Get ticket details by ID", 
               description = "Retrieves full ticket details including form submission values if caller has tenant access.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Ticket details retrieved",
                    content = @Content(schema = @Schema(implementation = TicketResponse.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden - cross-tenant access prohibited"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TicketResponse> getTicketById(
            @Parameter(description = "ID of the ticket", required = true)
            @PathVariable("id") @Positive(message = "Ticket ID must be positive") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        com.ticketpro.api.entity.Ticket ticket = ticketService.getTicketById(id);
        if (ticket != null) {
            if (!canAccessTicket(ticket, userDetails)) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(TicketResponse.from(ticket, null));
        }
        TicketResponse response = ticketService.getTicketResponseById(id, userDetails);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Create an authenticated support ticket", 
               description = "Creates a new ticket under the authenticated user's organization context.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Ticket created successfully",
                    content = @Content(schema = @Schema(implementation = TicketResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid ticket request payload")
    })
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TicketResponse> createTicket(
            @Valid @RequestBody TicketRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        TicketResponse response = ticketService.createTicketDto(request, userDetails);
        URI location;
        try {
            location = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/v1/tickets/{id}")
                    .buildAndExpand(response.getId())
                    .toUri();
        } catch (Exception e) {
            location = URI.create("/api/v1/tickets/" + (response != null ? response.getId() : ""));
        }
        return ResponseEntity.created(location).body(response);
    }

    @Operation(summary = "Update an existing ticket", 
               description = "Updates ticket metadata, priority, status, assignment, or custom form values.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Ticket updated successfully",
                    content = @Content(schema = @Schema(implementation = TicketResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request payload"),
            @ApiResponse(responseCode = "403", description = "Forbidden - unauthorized update"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TicketResponse> updateTicket(
            @Parameter(description = "ID of the ticket to update", required = true)
            @PathVariable("id") @Positive(message = "Ticket ID must be positive") Long id,
            @Valid @RequestBody TicketRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        TicketResponse response = ticketService.updateTicketDto(id, request, userDetails);
        return ResponseEntity.ok(response);
    }

    private boolean canAccessTicket(com.ticketpro.api.entity.Ticket ticket, CustomUserDetails userDetails) {
        com.ticketpro.api.entity.Role role = userDetails.getRole();
        if (role == com.ticketpro.api.entity.Role.SUPER_ADMIN) {
            return true;
        }

        if (ticket.getCompany() == null || userDetails.getCompanyId() == null
                || !userDetails.getCompanyId().equals(ticket.getCompany().getId())) {
            return false;
        }

        if (role == com.ticketpro.api.entity.Role.COMPANY_ADMIN) {
            return true;
        }
        if (role == com.ticketpro.api.entity.Role.AGENT || role == com.ticketpro.api.entity.Role.MANAGER) {
            return ticket.getAssignedTo() != null && userDetails.getId().equals(ticket.getAssignedTo().getId());
        }
        if (role == com.ticketpro.api.entity.Role.END_USER) {
            return ticket.getCreatedBy() != null && userDetails.getId().equals(ticket.getCreatedBy().getId());
        }

        return false;
    }

    @Operation(summary = "Delete a ticket", 
               description = "Soft-deletes a support ticket while maintaining audit history.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Ticket deleted successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden - unauthorized deletion"),
            @ApiResponse(responseCode = "404", description = "Ticket not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteTicket(
            @Parameter(description = "ID of the ticket to delete", required = true)
            @PathVariable("id") @Positive(message = "Ticket ID must be positive") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        ticketService.deleteTicketDto(id, userDetails);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Restore a soft-deleted ticket", 
               description = "Restores a soft-deleted support ticket back into active status.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Ticket restored successfully",
                    content = @Content(schema = @Schema(implementation = TicketResponse.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden - requires admin privileges")
    })
    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<TicketResponse> restoreTicket(
            @Parameter(description = "ID of the ticket to restore", required = true)
            @PathVariable("id") @Positive(message = "Ticket ID must be positive") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        TicketResponse response = ticketService.restoreTicketDto(id, userDetails);
        return ResponseEntity.ok(response);
    }
}
