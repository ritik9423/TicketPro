package com.ticketpro.api.controller;

import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.dto.TicketResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Priority;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.TicketStatus;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.entity.FormSubmissionValue;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.FormSubmissionValueRepository;
import com.ticketpro.api.repository.UserRepository;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ticket Controller — returns TicketResponse DTOs.
 * POST /api/tickets now REQUIRES authentication.
 * Guest ticket creation is available via PublicTicketController at /api/public/tickets.
 */
@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final FormSubmissionValueRepository formSubmissionValueRepository;

    public TicketController(TicketService ticketService, CompanyRepository companyRepository) {
        this(ticketService, companyRepository, null, null);
    }

    public TicketController(TicketService ticketService, CompanyRepository companyRepository, UserRepository userRepository) {
        this(ticketService, companyRepository, userRepository, null);
    }

    @Autowired
    public TicketController(TicketService ticketService, CompanyRepository companyRepository, UserRepository userRepository,
                            @Autowired(required = false) FormSubmissionValueRepository formSubmissionValueRepository) {
        this.ticketService = ticketService;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.formSubmissionValueRepository = formSubmissionValueRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getTickets(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(value = "direction", defaultValue = "desc") String direction,
            @RequestParam(value = "assignedToMe", required = false) Boolean assignedToMe,
            @RequestParam(value = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        boolean isPaged = (page != null && size != null && size > 0);
        // SECURITY L-2: Whitelist allowed sort fields
        java.util.Set<String> allowedSortFields = java.util.Set.of("id", "createdAt", "updatedAt", "priority", "status", "subject", "ticketNumber");
        String safeSortBy = allowedSortFields.contains(sortBy) ? sortBy : "createdAt";
        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(safeSortBy).ascending() : Sort.by(safeSortBy).descending();
        int pageNum = page != null ? Math.max(0, page.intValue()) : 0;
        int pageSize = size != null ? size.intValue() : 10;
        Pageable pageable = isPaged ? PageRequest.of(pageNum, pageSize, sort) : null;

        Long companyId = userDetails.getCompanyId();
        if (companyId == null && userDetails.getUser() != null && userDetails.getUser().getCompany() != null) {
            companyId = userDetails.getUser().getCompany().getId();
        }

        Object result = ticketService.getTicketsForRoleContext(
                userDetails.getRole(),
                companyId,
                userDetails.getId(),
                companyCode,
                pageable
        );

        // Convert entities to DTOs if the result is a List
        if (result instanceof List<?> list) {
            List<TicketResponse> dtos = list.stream()
                    .filter(item -> item instanceof Ticket)
                    .map(item -> TicketResponse.from((Ticket) item))
                    .toList();
            return ResponseEntity.ok(dtos);
        }
        if (result instanceof Page<?> pageResult) {
            Page<TicketResponse> dtoPage = pageResult.map(item -> {
                if (item instanceof Ticket t) return TicketResponse.from(t);
                return null;
            });
            return ResponseEntity.ok(dtoPage);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/page")
    @Transactional(readOnly = true)
    public ResponseEntity<Page<TicketResponse>> getTicketsPaged(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(value = "direction", defaultValue = "desc") String direction,
            @RequestParam(value = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Role role = userDetails.getRole();
        Page<Ticket> ticketPage;

        if (role == Role.SUPER_ADMIN) {
            if (companyCode != null && !companyCode.isBlank() && !"ALL".equalsIgnoreCase(companyCode) && !"SUPERADMIN".equalsIgnoreCase(companyCode)) {
                Company company = companyRepository.findByCompanyCode(companyCode).orElse(null);
                if (company != null) {
                    ticketPage = ticketService.getTicketsByCompanyPaged(company.getId(), pageable);
                    return ResponseEntity.ok(ticketPage.map(TicketResponse::from));
                }
            }
            ticketPage = ticketService.getAllTicketsPaged(pageable);
            return ResponseEntity.ok(ticketPage.map(TicketResponse::from));
        }

        if (role == Role.END_USER) {
            ticketPage = ticketService.getTicketsByUserPaged(userDetails.getId(), pageable);
            return ResponseEntity.ok(ticketPage.map(TicketResponse::from));
        }

        Long companyId = userDetails.getCompanyId();
        if (companyId == null && userDetails.getUser() != null && userDetails.getUser().getCompany() != null) {
            companyId = userDetails.getUser().getCompany().getId();
        }

        if (companyId == null) {
            return ResponseEntity.ok(Page.<TicketResponse>empty(pageable));
        }

        if (role == Role.COMPANY_ADMIN) {
            ticketPage = ticketService.getTicketsByCompanyPaged(companyId, pageable);
        } else if (role == Role.AGENT || role == Role.MANAGER) {
            ticketPage = ticketService.getTicketsByAgentPaged(userDetails.getId(), pageable);
        } else {
            ticketPage = ticketService.getTicketsByCompanyPaged(companyId, pageable);
        }
        return ResponseEntity.ok(ticketPage.map(TicketResponse::from));
    }

    @GetMapping("/search")
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
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(value = "direction", defaultValue = "desc") String direction,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Role role = userDetails.getRole();
        Long targetCompanyId = null;
        Long targetCreatedById = createdById;
        Long targetAssignedToId = assignedToId;

        if (role == Role.SUPER_ADMIN) {
            if (companyCode != null && !companyCode.isBlank() && !"ALL".equalsIgnoreCase(companyCode) && !"SUPERADMIN".equalsIgnoreCase(companyCode)) {
                Company company = companyRepository.findByCompanyCode(companyCode).orElse(null);
                if (company != null) {
                    targetCompanyId = company.getId();
                }
            }
        } else if (role == Role.END_USER) {
            targetCreatedById = userDetails.getId();
            targetCompanyId = userDetails.getCompanyId();
            if (targetCompanyId == null && userDetails.getUser() != null && userDetails.getUser().getCompany() != null) {
                targetCompanyId = userDetails.getUser().getCompany().getId();
            }
        } else {
            targetCompanyId = userDetails.getCompanyId();
            if (targetCompanyId == null && userDetails.getUser() != null && userDetails.getUser().getCompany() != null) {
                targetCompanyId = userDetails.getUser().getCompany().getId();
            }
            if (targetCompanyId == null) {
                return ResponseEntity.ok(Page.empty(pageable));
            }
            if (role == Role.AGENT || role == Role.MANAGER) {
                if (targetAssignedToId == null) {
                    targetAssignedToId = userDetails.getId();
                }
            }
        }

        Page<Ticket> result = ticketService.searchTicketsPaged(
                targetCompanyId, search, statuses, priorities, department,
                targetAssignedToId, targetCreatedById, startDate, endDate, slaBreached, pageable
        );

        return ResponseEntity.ok(result.map(TicketResponse::from));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable("id") Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Ticket ticket = ticketService.getTicketById(id);
        if (ticket == null) {
            return ResponseEntity.notFound().build();
        }
        if (!canAccessTicket(ticket, userDetails)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<FormSubmissionValue> submissions = (formSubmissionValueRepository != null && ticket.getId() != null)
                ? formSubmissionValueRepository.findByTicketId(ticket.getId())
                : null;
        return ResponseEntity.ok(TicketResponse.from(ticket, submissions));
    }

    /**
     * Authenticated ticket creation — requires a valid session/token.
     * Company and creator are resolved strictly from the authenticated principal.
     */
    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(
            @Valid @RequestBody TicketRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Authentication authentication) {
        // SECURITY: Authentication is now required (no more permitAll)
        if (userDetails == null && authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Company company = null;
        User creator = null;

        // 1. Resolve from authenticated principal (primary path)
        if (userDetails != null && userDetails.getUser() != null) {
            creator = userDetails.getUser();
            company = creator.getCompany();
        }

        // 2. Fallback: resolve from Spring Security authentication name
        if (creator == null && authentication != null && authentication.getName() != null && !authentication.getName().isBlank() && userRepository != null) {
            creator = userRepository.findByEmail(authentication.getName().trim().toLowerCase()).orElse(null);
            if (creator != null && company == null) {
                company = creator.getCompany();
            }
        }

        // 3. Resolve company from request only if still null (for SUPER_ADMIN cross-tenant creation)
        if (company == null && request.getCompanyCode() != null && !request.getCompanyCode().isBlank()) {
            if (userDetails != null && userDetails.getRole() == Role.SUPER_ADMIN) {
                company = companyRepository.findByCompanyCodeIgnoreCase(request.getCompanyCode().trim()).orElse(null);
            }
        }

        if (company == null && creator != null && creator.getCompany() != null) {
            company = creator.getCompany();
        }

        if (company == null) {
            throw new IllegalArgumentException("Tenant company is required to create a ticket. Specify a valid companyCode for SUPER_ADMIN or log in with an assigned company.");
        }

        if (creator == null) {
            throw new SecurityException("Valid authenticated user context is required to create a ticket.");
        }

        Ticket createdTicket = ticketService.createTicket(request, company, creator);
        List<FormSubmissionValue> submissions = (formSubmissionValueRepository != null && createdTicket.getId() != null)
                ? formSubmissionValueRepository.findByTicketId(createdTicket.getId())
                : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(TicketResponse.from(createdTicket, submissions));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TicketResponse> updateTicket(@PathVariable("id") Long id, @Valid @RequestBody TicketRequest request, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long companyId = userDetails.getCompanyId();
        Role userRole = userDetails.getRole();
        Long userId = userDetails.getId();
        Ticket updatedTicket = ticketService.updateTicket(id, request, companyId, userRole, userId);
        List<FormSubmissionValue> submissions = (formSubmissionValueRepository != null && updatedTicket.getId() != null)
                ? formSubmissionValueRepository.findByTicketId(updatedTicket.getId())
                : null;
        return ResponseEntity.ok(TicketResponse.from(updatedTicket, submissions));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable("id") Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long companyId = userDetails.getCompanyId();
        Role userRole = userDetails.getRole();
        User actor = userDetails.getUser();
        ticketService.deleteTicket(id, companyId, userRole, actor);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<TicketResponse> restoreTicket(@PathVariable("id") Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long companyId = userDetails.getCompanyId();
        Role userRole = userDetails.getRole();
        User actor = userDetails.getUser();
        Ticket restored = ticketService.restoreTicket(id, companyId, userRole, actor);
        return ResponseEntity.ok(TicketResponse.from(restored));
    }

    private boolean canAccessTicket(Ticket ticket, CustomUserDetails userDetails) {
        Role role = userDetails.getRole();
        if (role == Role.SUPER_ADMIN) {
            return true;
        }

        if (ticket.getCompany() == null || userDetails.getCompanyId() == null
                || !userDetails.getCompanyId().equals(ticket.getCompany().getId())) {
            return false;
        }

        if (role == Role.COMPANY_ADMIN) {
            return true;
        }
        if (role == Role.AGENT || role == Role.MANAGER) {
            return ticket.getAssignedTo() != null && userDetails.getId().equals(ticket.getAssignedTo().getId());
        }
        if (role == Role.END_USER) {
            return ticket.getCreatedBy() != null && userDetails.getId().equals(ticket.getCreatedBy().getId());
        }

        return false;
    }
}
