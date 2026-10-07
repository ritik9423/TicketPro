package com.ticketpro.api.controller;

import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.dto.TicketResponse;
import com.ticketpro.api.entity.Category;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.CompanyStatus;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.entity.FormSubmissionValue;
import com.ticketpro.api.exception.ResourceNotFoundException;
import com.ticketpro.api.repository.CategoryRepository;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.DepartmentRepository;
import com.ticketpro.api.repository.FormSubmissionValueRepository;
import com.ticketpro.api.repository.UserRepository;
import com.ticketpro.api.service.RateLimiterService;
import com.ticketpro.api.service.TicketService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/tickets")
public class PublicTicketController {

    private final TicketService ticketService;
    private final CompanyRepository companyRepository;
    private final CategoryRepository categoryRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final RateLimiterService rateLimiterService;
    private final FormSubmissionValueRepository formSubmissionValueRepository;

    @Autowired
    public PublicTicketController(TicketService ticketService,
                                  CompanyRepository companyRepository,
                                  CategoryRepository categoryRepository,
                                  UserRepository userRepository,
                                  RateLimiterService rateLimiterService,
                                  @Autowired(required = false) DepartmentRepository departmentRepository,
                                  @Autowired(required = false) FormSubmissionValueRepository formSubmissionValueRepository) {
        this.ticketService = ticketService;
        this.companyRepository = companyRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.rateLimiterService = rateLimiterService;
        this.departmentRepository = departmentRepository;
        this.formSubmissionValueRepository = formSubmissionValueRepository;
    }

    public PublicTicketController(TicketService ticketService,
                                  CompanyRepository companyRepository,
                                  CategoryRepository categoryRepository,
                                  UserRepository userRepository,
                                  RateLimiterService rateLimiterService,
                                  DepartmentRepository departmentRepository) {
        this(ticketService, companyRepository, categoryRepository, userRepository, rateLimiterService, departmentRepository, null);
    }

    public PublicTicketController(TicketService ticketService,
                                  CompanyRepository companyRepository,
                                  CategoryRepository categoryRepository,
                                  UserRepository userRepository,
                                  RateLimiterService rateLimiterService) {
        this(ticketService, companyRepository, categoryRepository, userRepository, rateLimiterService, null, null);
    }

    /**
     * Guest ticket creation — no authentication required.
     * Enforces rate-limiting, mandatory active companyCode validation, and cross-tenant checks.
     */
    @PostMapping
    public ResponseEntity<TicketResponse> createPublicTicket(@Valid @RequestBody TicketRequest request,
                                                             HttpServletRequest servletRequest) {
        // 1. Rate Limiting Protection (429 Too Many Requests)
        String clientIp = extractClientIp(servletRequest);
        if (!rateLimiterService.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("Retry-After", String.valueOf(rateLimiterService.getWindowSeconds()))
                    .build();
        }

        // 2. Strict companyCode validation — NO default fallback
        if (request.getCompanyCode() == null || request.getCompanyCode().trim().isBlank()) {
            throw new IllegalArgumentException("companyCode is required for public ticket submission.");
        }

        Company company = companyRepository.findByCompanyCodeIgnoreCase(request.getCompanyCode().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Company", "companyCode", request.getCompanyCode()));

        if (company.getStatus() != CompanyStatus.ACTIVE) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 3. Category cross-tenant validation
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", request.getCategoryId()));
            if (category.getCompany() == null || !category.getCompany().getId().equals(company.getId())) {
                throw new IllegalArgumentException("Category does not belong to the requested company.");
            }
        }

        // 4. Department cross-tenant validation
        if (departmentRepository != null) {
            if (request.getDepartmentId() != null) {
                com.ticketpro.api.entity.Department dept = departmentRepository.findById(request.getDepartmentId())
                        .orElseThrow(() -> new ResourceNotFoundException("Department", request.getDepartmentId()));
                if (dept.getCompany() == null || !dept.getCompany().getId().equals(company.getId())) {
                    throw new IllegalArgumentException("Department does not belong to the requested company.");
                }
            } else if (request.getDepartment() != null && !request.getDepartment().isBlank()) {
                String deptName = request.getDepartment().trim();
                departmentRepository.findByNameIgnoreCase(deptName).ifPresent(foreignDept -> {
                    if (foreignDept.getCompany() != null && !foreignDept.getCompany().getId().equals(company.getId())) {
                        throw new IllegalArgumentException("Department does not belong to the requested company.");
                    }
                });
            }
        }

        // 5. Attribute public tickets strictly to the company's designated support user - NEVER a cross-tenant user
        User creator = userRepository.findFirstByCompanyIdOrderByIdAsc(company.getId())
                .orElseThrow(() -> new IllegalStateException("No support user is configured for this company."));

        Ticket createdTicket = ticketService.createTicket(request, company, creator);
        List<FormSubmissionValue> submissions = (formSubmissionValueRepository != null && createdTicket.getId() != null)
                ? formSubmissionValueRepository.findByTicketId(createdTicket.getId())
                : null;
        return ResponseEntity.status(HttpStatus.CREATED).body(TicketResponse.from(createdTicket, submissions));
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "unknown";
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr != null && !remoteAddr.isBlank()) ? remoteAddr : "unknown";
    }
}
