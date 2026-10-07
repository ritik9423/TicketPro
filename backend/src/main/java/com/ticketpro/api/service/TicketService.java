package com.ticketpro.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.dto.TicketResponse;
import com.ticketpro.api.entity.Category;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Priority;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.SlaPolicy;
import com.ticketpro.api.entity.SlaStatus;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.TicketStatus;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.SlaPolicyRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import com.ticketpro.api.specification.TicketSpecification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.ticketpro.api.entity.FormField;
import com.ticketpro.api.entity.FormSubmissionValue;
import com.ticketpro.api.entity.FormTemplate;
import com.ticketpro.api.repository.FormSubmissionValueRepository;
import com.ticketpro.api.repository.FormTemplateRepository;

@Slf4j
@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserService userService;
    private final CategoryService categoryService;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final SlaPolicyRepository slaPolicyRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecureRandom secureRandom = new SecureRandom();

    @Autowired(required = false)
    private AuditLogService auditLogService;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Autowired(required = false)
    private AutoAssignmentService autoAssignmentService;

    @Autowired(required = false)
    private TicketHistoryService ticketHistoryService;

    @Autowired(required = false)
    private FormTemplateRepository formTemplateRepository;

    @Autowired(required = false)
    private FormSubmissionValueRepository formSubmissionValueRepository;

    public TicketService(TicketRepository ticketRepository, 
                         UserService userService, 
                         CategoryService categoryService, 
                         CompanyRepository companyRepository,
                         UserRepository userRepository,
                         EmailService emailService,
                         NotificationService notificationService,
                         SlaPolicyRepository slaPolicyRepository) {
        this(ticketRepository, userService, categoryService, companyRepository, userRepository,
             emailService, notificationService, slaPolicyRepository, null, null);
    }

    @Autowired
    public TicketService(TicketRepository ticketRepository, 
                         UserService userService, 
                         CategoryService categoryService, 
                         CompanyRepository companyRepository,
                         UserRepository userRepository,
                         EmailService emailService,
                         NotificationService notificationService,
                         SlaPolicyRepository slaPolicyRepository,
                         @Autowired(required = false) FormTemplateRepository formTemplateRepository,
                         @Autowired(required = false) FormSubmissionValueRepository formSubmissionValueRepository) {
        this.ticketRepository = ticketRepository;
        this.userService = userService;
        this.categoryService = categoryService;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.slaPolicyRepository = slaPolicyRepository;
        this.formTemplateRepository = formTemplateRepository;
        this.formSubmissionValueRepository = formSubmissionValueRepository;
    }

    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    public Page<Ticket> getAllTicketsPaged(Pageable pageable) {
        return ticketRepository.findAll(pageable);
    }

    public List<Ticket> getTicketsByCompany(Long companyId) {
        return ticketRepository.findByCompanyId(companyId);
    }

    public Page<Ticket> getTicketsByCompanyPaged(Long companyId, Pageable pageable) {
        return ticketRepository.findByCompanyId(companyId, pageable);
    }

    public List<Ticket> getTicketsByUser(Long userId) {
        return ticketRepository.findByCreatedById(userId);
    }

    public Page<Ticket> getTicketsByUserPaged(Long userId, Pageable pageable) {
        return ticketRepository.findByCreatedById(userId, pageable);
    }

    public List<Ticket> getTicketsByAgent(Long agentId) {
        return ticketRepository.findByAssignedToId(agentId);
    }

    public Page<Ticket> getTicketsByAgentPaged(Long agentId, Pageable pageable) {
        return ticketRepository.findByAssignedToId(agentId, pageable);
    }

    /**
     * Industry Clean-Architecture Pattern:
     * Encapsulates multi-tenant and role-based ticket resolution logic within the Service layer,
     * removing business logic from the HTTP Controller.
     */
    public Object getTicketsForRoleContext(
            Role role,
            Long companyId,
            Long userId,
            String companyCode,
            Pageable pageable) {
        boolean isPaged = (pageable != null);

        // 1. SUPER_ADMIN: Global visibility or filtered by specific tenant
        if (role == Role.SUPER_ADMIN) {
            if (companyCode != null && !companyCode.isBlank() && !"ALL".equalsIgnoreCase(companyCode) && !"SUPERADMIN".equalsIgnoreCase(companyCode)) {
                Company company = companyRepository.findByCompanyCode(companyCode).orElse(null);
                if (company != null) {
                    return isPaged
                            ? getTicketsByCompanyPaged(company.getId(), pageable)
                            : getTicketsByCompany(company.getId());
                }
            }
            return isPaged
                    ? getAllTicketsPaged(pageable)
                    : getAllTickets();
        }

        // 2. END_USER: Only tickets raised by this customer (authorized for self-view even if companyId is unset)
        if (role == Role.END_USER) {
            return isPaged
                    ? getTicketsByUserPaged(userId, pageable)
                    : getTicketsByUser(userId);
        }

        // Safety check: tenant-scoped staff (admin/agent/manager) must have a valid company
        if (companyId == null) {
            return isPaged ? Page.empty(java.util.Objects.requireNonNull(pageable)) : java.util.Collections.emptyList();
        }

        // 3. COMPANY_ADMIN: All tickets belonging to the tenant
        if (role == Role.COMPANY_ADMIN) {
            return isPaged
                    ? getTicketsByCompanyPaged(companyId, pageable)
                    : getTicketsByCompany(companyId);
        }

        // 4. AGENT / MANAGER: Only tickets assigned to this agent in their company
        if (role == Role.AGENT || role == Role.MANAGER) {
            return isPaged
                    ? getTicketsByAgentPaged(userId, pageable)
                    : getTicketsByAgent(userId);
        }

        // 5. Safe fallback
        return isPaged
                ? getTicketsByCompanyPaged(companyId, pageable)
                : getTicketsByCompany(companyId);
    }

    public Page<Ticket> searchTicketsPaged(
            Long companyId,
            String search,
            List<TicketStatus> statuses,
            List<Priority> priorities,
            String department,
            Long assignedToId,
            Long createdById,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Boolean slaBreached,
            Pageable pageable
    ) {
        var spec = TicketSpecification.filterTickets(
                companyId,
                search,
                statuses,
                priorities,
                department,
                assignedToId,
                createdById,
                startDate,
                endDate,
                slaBreached
        );
        return ticketRepository.findAll(spec, pageable);
    }

    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + id));
    }

    public Ticket getTicketByNumber(String ticketNumber) {
        return ticketRepository.findByTicketNumber(ticketNumber)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with number: " + ticketNumber));
    }

    /**
     * Resolves submitted form values from explicit map or parsed description.
     */
    private Map<String, Object> extractSubmittedFormValues(TicketRequest request) {
        Map<String, Object> values = new LinkedHashMap<>();
        if (request.getFormValues() != null) {
            values.putAll(request.getFormValues());
        }
        if (request.getCustomFields() != null) {
            for (Map.Entry<String, Object> entry : request.getCustomFields().entrySet()) {
                values.putIfAbsent(entry.getKey(), entry.getValue());
            }
        }
        if (values.isEmpty() && request.getDescription() != null && request.getDescription().contains("--- DYNAMIC FORM BUILDER FIELDS ---")) {
            String desc = request.getDescription();
            int idx = desc.indexOf("--- DYNAMIC FORM BUILDER FIELDS ---");
            String sub = desc.substring(idx + "--- DYNAMIC FORM BUILDER FIELDS ---".length());
            String[] lines = sub.split("\\r?\\n");
            for (String line : lines) {
                line = line.trim();
                if (line.startsWith("[Section:") || line.startsWith("Attachment:") || line.isBlank()) continue;
                int colonIdx = line.indexOf(':');
                if (colonIdx > 0) {
                    String k = line.substring(0, colonIdx).trim();
                    String v = line.substring(colonIdx + 1).trim();
                    values.putIfAbsent(k, v);
                }
            }
        }
        return values;
    }

    private Object findSubmittedValue(Map<String, Object> submitted, FormField field) {
        if (submitted == null || submitted.isEmpty() || field == null) return null;
        if (field.getFieldKey() != null && submitted.containsKey(field.getFieldKey())) {
            return submitted.get(field.getFieldKey());
        }
        if (field.getLabel() != null && submitted.containsKey(field.getLabel())) {
            return submitted.get(field.getLabel());
        }
        for (Map.Entry<String, Object> entry : submitted.entrySet()) {
            if (field.getFieldKey() != null && entry.getKey().equalsIgnoreCase(field.getFieldKey())) {
                return entry.getValue();
            }
            if (field.getLabel() != null && entry.getKey().equalsIgnoreCase(field.getLabel())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private void validateSubmittedValue(FormField field, Object val) {
        if (val == null || (val instanceof String s && s.trim().isEmpty())) {
            if (Boolean.TRUE.equals(field.getRequired())) {
                throw new IllegalArgumentException("Required form field '" + field.getLabel() + "' is missing.");
            }
            return;
        }

        String strVal = String.valueOf(val).trim();
        String type = field.getFieldType() != null ? field.getFieldType().toUpperCase() : "TEXT";

        switch (type) {
            case "NUMBER":
                try {
                    Double.parseDouble(strVal);
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Field '" + field.getLabel() + "' must be a valid number.");
                }
                break;
            case "EMAIL":
                if (!strVal.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
                    throw new IllegalArgumentException("Field '" + field.getLabel() + "' must be a valid email address.");
                }
                break;
            case "DATE":
                try {
                    java.time.LocalDate.parse(strVal);
                } catch (Exception e) {
                    try {
                        java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd").parse(strVal);
                    } catch (Exception ex) {
                        throw new IllegalArgumentException("Field '" + field.getLabel() + "' must be a valid date (YYYY-MM-DD).");
                    }
                }
                break;
            case "DROPDOWN":
            case "RADIO":
                if (field.getOptions() != null && !field.getOptions().isEmpty()) {
                    boolean match = field.getOptions().stream().anyMatch(opt ->
                            (opt.getValue() != null && opt.getValue().equalsIgnoreCase(strVal)) ||
                            (opt.getLabel() != null && opt.getLabel().equalsIgnoreCase(strVal))
                    );
                    if (!match) {
                        throw new IllegalArgumentException("Invalid option '" + strVal + "' for field '" + field.getLabel() + "'.");
                    }
                }
                break;
            default:
                break;
        }
    }

    /**
     * Dynamic Form Schema Validator (Legacy Description Support)
     */
    private void validateCategoryDynamicFields(Category category, String description) {
        if (category == null || category.getDescription() == null || !category.getDescription().startsWith("FIELDS:")) {
            return;
        }
        try {
            String jsonSchema = category.getDescription().substring(7);
            List<Map<String, Object>> fields = objectMapper.readValue(jsonSchema, new TypeReference<>() {});
            if (fields != null) {
                for (Map<String, Object> field : fields) {
                    Boolean isRequired = (Boolean) field.get("required");
                    String label = (String) field.get("label");
                    if (Boolean.TRUE.equals(isRequired) && label != null && !label.isBlank()) {
                        if (description == null || !description.contains(label + ":")) {
                            throw new IllegalArgumentException("Missing required form field: '" + label + "'.");
                        }
                    }
                }
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Dynamic schema validation parser warning: {}", e.getMessage());
        }
    }

    @Transactional
    public Ticket createTicket(TicketRequest request, Company company, User creator) {
        Ticket ticket = new Ticket();
        ticket.setCompany(company);
        ticket.setCreatedBy(creator);
        ticket.setSubject(request.getSubject());
        ticket.setDescription(request.getDescription());
        Priority priority = request.getPriority() != null ? request.getPriority() : Priority.MEDIUM;
        ticket.setPriority(priority);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setTicketNumber(generateTicketNumber(company != null ? company.getCompanyCode() : "TK"));

        // Calculate SLA deadlines if policy is active
        if (company != null && company.getId() != null) {
            Optional<SlaPolicy> slaPolicyOpt = slaPolicyRepository.findByCompanyIdAndPriority(company.getId(), priority);
            LocalDateTime now = LocalDateTime.now();
            if (slaPolicyOpt.isPresent() && slaPolicyOpt.get().getStatus() == SlaStatus.ACTIVE) {
                SlaPolicy policy = slaPolicyOpt.get();
                ticket.setSlaResponseDeadline(now.plusMinutes(policy.getResponseTimeMinutes()));
                ticket.setSlaResolutionDeadline(now.plusMinutes(policy.getResolutionTimeMinutes()));
            } else {
                int responseMinutes = switch (priority) {
                    case CRITICAL -> 30;
                    case HIGH -> 120;
                    case MEDIUM -> 480;
                    case LOW -> 1440;
                };
                int resolutionMinutes = switch (priority) {
                    case CRITICAL -> 240;
                    case HIGH -> 720;
                    case MEDIUM -> 2880;
                    case LOW -> 4320;
                };
                ticket.setSlaResponseDeadline(now.plusMinutes(responseMinutes));
                ticket.setSlaResolutionDeadline(now.plusMinutes(resolutionMinutes));
            }
        }
        ticket.setSlaBreached(false);

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryService.getCategoryById(request.getCategoryId());
            if (category != null) {
                if (company != null && category.getCompany() != null && !category.getCompany().getId().equals(company.getId())) {
                    throw new IllegalArgumentException("Selected category does not belong to your company.");
                }
                ticket.setCategory(category);
            }
        }

        // Dynamic Form Integration: Determine FormTemplate for this company & category
        FormTemplate activeTemplate = null;
        if (formTemplateRepository != null && company != null && company.getId() != null && category != null && category.getId() != null) {
            Optional<FormTemplate> templateOpt = formTemplateRepository.findFirstByCompanyIdAndCategoryIdAndStatusOrderByVersionDesc(company.getId(), category.getId(), "ACTIVE");
            if (templateOpt.isEmpty()) {
                templateOpt = formTemplateRepository.findFirstByCategoryIdAndStatusOrderByVersionDesc(category.getId(), "ACTIVE");
            }
            if (templateOpt.isEmpty()) {
                templateOpt = formTemplateRepository.findByCompanyIdAndCategoryId(company.getId(), category.getId());
            }
            if (templateOpt.isEmpty()) {
                templateOpt = formTemplateRepository.findByCategoryId(category.getId());
            }
            if (templateOpt.isPresent()) {
                FormTemplate t = templateOpt.get();
                if (t.getCompany() != null && !t.getCompany().getId().equals(company.getId())) {
                    throw new IllegalArgumentException("Form template does not belong to your company.");
                }
                if (t.getStatus() == null || "ACTIVE".equalsIgnoreCase(t.getStatus())) {
                    activeTemplate = t;
                }
            }
        }

        if (activeTemplate != null) {
            ticket.setFormTemplate(activeTemplate);
        }

        Map<String, Object> submittedFormValues = extractSubmittedFormValues(request);
        if (activeTemplate != null && activeTemplate.getFields() != null) {
            for (FormField f : activeTemplate.getFields()) {
                Object val = findSubmittedValue(submittedFormValues, f);
                validateSubmittedValue(f, val);
            }
        } else if (category != null) {
            validateCategoryDynamicFields(category, request.getDescription());
        }

        User assignedAgent = null;
        if (request.getAssignedToId() != null) {
            assignedAgent = userService.getUserById(request.getAssignedToId());
            if (assignedAgent != null) {
                if (company != null && (assignedAgent.getCompany() == null || !assignedAgent.getCompany().getId().equals(company.getId()))) {
                    throw new IllegalArgumentException("Assigned agent does not belong to your company.");
                }
                ticket.setAssignedTo(assignedAgent);
                ticket.setStatus(TicketStatus.IN_PROGRESS);
            }
        }

        // Smart Auto-Assignment (Least-Loaded agent in Department)
        if (assignedAgent == null && autoAssignmentService != null) {
            try {
                String resolvedDept = autoAssignmentService.resolveDepartment(
                        request.getDepartment(),
                        ticket.getCategory(),
                        company != null ? company.getId() : null
                );
                if (resolvedDept != null && !resolvedDept.isBlank()) {
                    ticket.setDepartment(resolvedDept);
                }
                assignedAgent = autoAssignmentService.assignBestAgent(company, ticket.getDepartment(), ticket.getCategory());
                if (assignedAgent != null) {
                    ticket.setAssignedTo(assignedAgent);
                    ticket.setStatus(TicketStatus.IN_PROGRESS);
                    log.info("Auto-assigned ticket {} to agent {} (Dept: {})", ticket.getTicketNumber(), assignedAgent.getName(), ticket.getDepartment());
                }
            } catch (Exception e) {
                log.warn("Auto-assignment skipped due to error: {}", e.getMessage());
            }
        } else if (ticket.getDepartment() == null && request.getDepartment() != null) {
            ticket.setDepartment(request.getDepartment());
        }

        Ticket saved = ticketRepository.save(ticket);

        // Persist Dynamic Form Submission Values
        if (activeTemplate != null && activeTemplate.getFields() != null && formSubmissionValueRepository != null) {
            for (FormField f : activeTemplate.getFields()) {
                Object val = findSubmittedValue(submittedFormValues, f);
                if (val != null) {
                    String strVal = String.valueOf(val).trim();
                    if (!strVal.isEmpty()) {
                        FormSubmissionValue subVal = new FormSubmissionValue(saved, f, strVal);
                        formSubmissionValueRepository.save(subVal);
                    }
                }
            }
        }

        // Record Audit Trail
        if (auditLogService != null) {
            try {
                auditLogService.log(
                        creator,
                        company,
                        "TICKET_CREATED",
                        "TICKET",
                        saved.getId(),
                        "Ticket created: " + saved.getTicketNumber() + " - " + saved.getSubject(),
                        null
                );
            } catch (Exception e) {
                log.warn("Could not save audit log for ticket creation: {}", e.getMessage());
            }
        }

        // Record Ticket History
        if (ticketHistoryService != null) {
            try {
                ticketHistoryService.recordChange(saved, "TICKET_CREATED", null, null, saved.getStatus().name(), creator);
            } catch (Exception e) {
                log.warn("Could not record ticket history for creation: {}", e.getMessage());
            }
        }

        // Real-time WebSocket Broadcast (Multi-Device Live Sync)
        if (messagingTemplate != null) {
            try {
                // SECURITY C-6: Broadcast strictly to tenant-scoped topics and use safe DTO
                TicketResponse ticketDto = TicketResponse.from(saved);
                if (company != null && company.getCompanyCode() != null) {
                    messagingTemplate.convertAndSend("/topic/tickets/" + company.getCompanyCode().toUpperCase(), ticketDto);
                }
            } catch (Exception e) {
                log.error("WebSocket ticket broadcast error: {}", e.getMessage());
            }
        }

        // Send Role-Wise & Company-Restricted Emails safely
        try {
            if (company != null) {
                List<User> companyAdmins = userRepository.findByCompanyIdAndRole(company.getId(), Role.COMPANY_ADMIN);
                emailService.sendTicketCreatedNotifications(saved, company, creator, assignedAgent, companyAdmins);
            }
        } catch (Exception e) {
            log.error("Email dispatch notification error: {}", e.getMessage());
        }

        // Role-Based In-App Bell Notifications
        try {
            String compCode = company != null ? company.getCompanyCode() : "GLOBAL";
            if (creator != null && creator.getEmail() != null) {
                notificationService.saveNotification(
                        creator.getEmail(),
                        "Ticket Received: " + saved.getTicketNumber(),
                        "Your support ticket '" + saved.getSubject() + "' has been received and logged.",
                        "TICKET_CREATED",
                        compCode,
                        "USER",
                        "/tickets/" + saved.getId()
                );
            }
            if (assignedAgent != null && assignedAgent.getEmail() != null) {
                notificationService.saveNotification(
                        assignedAgent.getEmail(),
                        "New Ticket Assigned: " + saved.getTicketNumber(),
                        "You have been assigned to resolve: " + saved.getSubject(),
                        "TICKET_ASSIGNED",
                        compCode,
                        "AGENT",
                        "/tickets/" + saved.getId()
                );
            } else {
                notificationService.saveNotification(
                        null,
                        "New Unassigned Ticket: " + saved.getTicketNumber(),
                        "Ticket '" + saved.getSubject() + "' requires agent assignment.",
                        "TICKET_UNASSIGNED",
                        compCode,
                        "COMPANY_ADMIN",
                        "/tickets/" + saved.getId()
                );
            }
        } catch (Exception e) {
            log.error("Ticket creation in-app notification error: {}", e.getMessage());
        }

        return saved;
    }

    /**
     * Priority 1.1: Strict field-level authorization for ticket updates.
     */
    public void validateTicketUpdatePermissions(
            Role userRole,
            Long callerCompanyId,
            Long callerUserId,
            Ticket existingTicket,
            TicketRequest request
    ) {
        if (userRole == null) {
            throw new SecurityException("Unauthenticated user cannot update tickets.");
        }

        // Cross-tenant boundary check: non-SUPER_ADMIN cannot touch another company's tickets
        if (userRole != Role.SUPER_ADMIN) {
            if (callerCompanyId == null || existingTicket.getCompany() == null 
                    || !existingTicket.getCompany().getId().equals(callerCompanyId)) {
                throw new SecurityException("Unauthorized ticket access: Cross-tenant access is strictly forbidden.");
            }
        }

        // Company reassignment tampering
        if (userRole != Role.SUPER_ADMIN && request.getCompanyCode() != null && !request.getCompanyCode().isBlank()) {
            if (existingTicket.getCompany() != null && !request.getCompanyCode().trim().equalsIgnoreCase(existingTicket.getCompany().getCompanyCode())) {
                throw new SecurityException("Unauthorized: Modifying the company or tenant of a ticket is strictly forbidden.");
            }
        }

        // Ticket owner/creator tampering
        if (userRole != Role.SUPER_ADMIN) {
            if (request.getCreatedById() != null && existingTicket.getCreatedBy() != null 
                    && !request.getCreatedById().equals(existingTicket.getCreatedBy().getId())) {
                throw new SecurityException("Unauthorized: Modifying ticket owner/creator is not permitted.");
            }
            if (request.getCreatorEmail() != null && !request.getCreatorEmail().isBlank()
                    && existingTicket.getCreatedBy() != null
                    && !request.getCreatorEmail().trim().equalsIgnoreCase(existingTicket.getCreatedBy().getEmail())) {
                throw new SecurityException("Unauthorized: Modifying ticket creator email is not permitted.");
            }
        }

        // Role-based restrictions:
        switch (userRole) {
            case END_USER -> {
                // Must be the creator of the ticket
                if (existingTicket.getCreatedBy() == null || callerUserId == null || !existingTicket.getCreatedBy().getId().equals(callerUserId)) {
                    throw new SecurityException("Unauthorized: End users can only update their own tickets.");
                }
                // Cannot change status
                if (request.getStatus() != null && request.getStatus() != existingTicket.getStatus()) {
                    throw new SecurityException("End users are not permitted to change ticket status.");
                }
                // Cannot change priority
                if (request.getPriority() != null && request.getPriority() != existingTicket.getPriority()) {
                    throw new SecurityException("End users are not permitted to change ticket priority.");
                }
                // Cannot change assignedTo
                if (request.getAssignedToId() != null) {
                    Long existingAssigned = existingTicket.getAssignedTo() != null ? existingTicket.getAssignedTo().getId() : null;
                    if (!request.getAssignedToId().equals(existingAssigned)) {
                        throw new SecurityException("End users are not permitted to assign or reassign tickets.");
                    }
                }
                // Cannot change department
                if (request.getDepartment() != null && !request.getDepartment().trim().isEmpty()) {
                    String existingDept = existingTicket.getDepartment() != null ? existingTicket.getDepartment().trim() : "";
                    if (!request.getDepartment().trim().equalsIgnoreCase(existingDept)) {
                        throw new SecurityException("End users are not permitted to change ticket department.");
                    }
                }
                // Cannot change category
                if (request.getCategoryId() != null) {
                    Long existingCat = existingTicket.getCategory() != null ? existingTicket.getCategory().getId() : null;
                    if (!request.getCategoryId().equals(existingCat)) {
                        throw new SecurityException("End users are not permitted to change ticket category.");
                    }
                }
            }
            case AGENT -> {
                // AGENT cannot change department
                if (request.getDepartment() != null && !request.getDepartment().trim().isEmpty()) {
                    String existingDept = existingTicket.getDepartment() != null ? existingTicket.getDepartment().trim() : "";
                    if (!request.getDepartment().trim().equalsIgnoreCase(existingDept)) {
                        throw new SecurityException("Agents are not permitted to re-route ticket departments.");
                    }
                }
                // AGENT cannot assign/reassign to arbitrary agents
                if (request.getAssignedToId() != null) {
                    Long existingAssigned = existingTicket.getAssignedTo() != null ? existingTicket.getAssignedTo().getId() : null;
                    if (!request.getAssignedToId().equals(existingAssigned) && !request.getAssignedToId().equals(callerUserId)) {
                        throw new SecurityException("Agents are not permitted to reassign tickets to other agents.");
                    }
                }
            }
            case MANAGER, COMPANY_ADMIN -> {
                // Within callerCompanyId (validated above)
            }
            case SUPER_ADMIN -> {
                // Cross-tenant access permitted
            }
        }
    }

    @Transactional
    public Ticket updateTicket(Long id, TicketRequest request, Long companyId, Role userRole, Long userId) {
        Ticket ticket = getTicketById(id);
        String oldStatus = ticket.getStatus() != null ? ticket.getStatus().name() : "OPEN";
        Priority oldPriority = ticket.getPriority();
        String oldDept = ticket.getDepartment();
        Category oldCat = ticket.getCategory();
        User previousAgent = ticket.getAssignedTo();
        Long previousAgentId = previousAgent != null ? previousAgent.getId() : null;
        String oldSubject = ticket.getSubject();
        String oldDesc = ticket.getDescription();

        // 1. Role-based and tenant authorization checks
        validateTicketUpdatePermissions(userRole, companyId, userId, ticket, request);

        // Record first response timestamp if staff responds
        if (ticket.getFirstResponseAt() == null && (userRole == Role.AGENT || userRole == Role.COMPANY_ADMIN || userRole == Role.MANAGER)) {
            ticket.setFirstResponseAt(LocalDateTime.now());
        }

        boolean detailsChanged = false;
        if (request.getSubject() != null && !request.getSubject().equals(oldSubject)) {
            ticket.setSubject(request.getSubject());
            detailsChanged = true;
        }
        if (request.getDescription() != null && !request.getDescription().equals(oldDesc)) {
            ticket.setDescription(request.getDescription());
            detailsChanged = true;
        }

        boolean priorityChanged = false;
        if (request.getPriority() != null && request.getPriority() != oldPriority) {
            ticket.setPriority(request.getPriority());
            priorityChanged = true;
        }

        boolean categoryChanged = false;
        if (request.getCategoryId() != null) {
            Category category = categoryService.getCategoryById(request.getCategoryId());
            if (!category.getCompany().getId().equals(ticket.getCompany().getId())) {
                throw new IllegalArgumentException("Category does not belong to the ticket's company.");
            }
            validateCategoryDynamicFields(category, request.getDescription());
            if (oldCat == null || !oldCat.getId().equals(category.getId())) {
                categoryChanged = true;
            }
            ticket.setCategory(category);
        }

        boolean agentChanged = false;
        if (request.getAssignedToId() != null) {
            User agent = userService.getUserById(request.getAssignedToId());
            if (!agent.getCompany().getId().equals(ticket.getCompany().getId()) || agent.getRole() != Role.AGENT) {
                throw new IllegalArgumentException("Invalid agent selection.");
            }
            if (previousAgentId == null || !previousAgentId.equals(agent.getId())) {
                agentChanged = true;
            }
            ticket.setAssignedTo(agent);
            if (ticket.getStatus() == TicketStatus.OPEN) {
                ticket.setStatus(TicketStatus.IN_PROGRESS);
            }
        } else if (request.getStatus() == null && userRole == Role.COMPANY_ADMIN) {
            if (previousAgent != null) agentChanged = true;
            ticket.setAssignedTo(null);
        }

        boolean departmentChanged = false;
        if (request.getDepartment() != null && !request.getDepartment().trim().isBlank()) {
            String newDept = request.getDepartment().trim();
            departmentChanged = ticket.getDepartment() == null || !ticket.getDepartment().equalsIgnoreCase(newDept);
            ticket.setDepartment(newDept);

            // Auto-assign least loaded agent in new department if re-routed
            if (departmentChanged && request.getAssignedToId() == null && autoAssignmentService != null) {
                User deptAgent = autoAssignmentService.assignBestAgent(ticket.getCompany(), newDept, ticket.getCategory());
                if (deptAgent != null) {
                    ticket.setAssignedTo(deptAgent);
                    agentChanged = true;
                    log.info("Re-routed ticket {} to department '{}' and auto-assigned agent '{}'", ticket.getTicketNumber(), newDept, deptAgent.getName());
                }
            }
        }

        boolean statusChanged = false;
        if (request.getStatus() != null && request.getStatus() != ticket.getStatus()) {
            ticket.setStatus(request.getStatus());
            statusChanged = true;
            if (request.getStatus() == TicketStatus.RESOLVED) {
                ticket.setResolvedAt(LocalDateTime.now());
            } else if (request.getStatus() == TicketStatus.CLOSED) {
                ticket.setClosedAt(LocalDateTime.now());
            }
        }

        Ticket saved = ticketRepository.save(ticket);
        User actor = (userId != null) ? userRepository.findById(userId).orElse(null) : null;

        // Dynamic Form Integration: Update Dynamic Form Values for Ticket
        Map<String, Object> submittedFormValues = extractSubmittedFormValues(request);
        if ((request.getFormValues() != null || request.getCustomFields() != null || !submittedFormValues.isEmpty())
                && formSubmissionValueRepository != null) {

            FormTemplate ticketTemplate = saved.getFormTemplate();
            if (ticketTemplate == null && formTemplateRepository != null) {
                List<FormSubmissionValue> existingSubs = formSubmissionValueRepository.findByTicketId(saved.getId());
                if (!existingSubs.isEmpty() && existingSubs.get(0).getField() != null) {
                    ticketTemplate = existingSubs.get(0).getField().getFormTemplate();
                }
                if (ticketTemplate == null && saved.getCompany() != null && saved.getCategory() != null) {
                    ticketTemplate = formTemplateRepository.findFirstByCompanyIdAndCategoryIdAndStatusOrderByVersionDesc(
                            saved.getCompany().getId(), saved.getCategory().getId(), "ACTIVE").orElse(null);
                    if (ticketTemplate == null) {
                        ticketTemplate = formTemplateRepository.findFirstByCategoryIdAndStatusOrderByVersionDesc(
                                saved.getCategory().getId(), "ACTIVE").orElse(null);
                    }
                }
                if (ticketTemplate != null) {
                    saved.setFormTemplate(ticketTemplate);
                    ticketRepository.save(saved);
                }
            }

            if (ticketTemplate != null && ticketTemplate.getFields() != null) {
                if (ticketTemplate.getCompany() != null && saved.getCompany() != null
                        && !ticketTemplate.getCompany().getId().equals(saved.getCompany().getId())) {
                    throw new SecurityException("Cross-tenant dynamic form access denied.");
                }

                // 1. Validate that submitted field keys or IDs belong to ticketTemplate & tenant
                for (Map.Entry<String, Object> entry : submittedFormValues.entrySet()) {
                    String submittedKey = entry.getKey();
                    boolean fieldExists = ticketTemplate.getFields().stream().anyMatch(f ->
                            (f.getFieldKey() != null && f.getFieldKey().equalsIgnoreCase(submittedKey)) ||
                            (f.getLabel() != null && f.getLabel().equalsIgnoreCase(submittedKey)) ||
                            (f.getId() != null && f.getId().toString().equals(submittedKey))
                    );
                    if (!fieldExists) {
                        throw new IllegalArgumentException("Invalid form field '" + submittedKey + "' for ticket's form version.");
                    }
                }

                // 2. Validate field values (required check, type validation, dropdown options)
                for (FormField f : ticketTemplate.getFields()) {
                    Object val = findSubmittedValue(submittedFormValues, f);
                    Optional<FormSubmissionValue> existingSubOpt = formSubmissionValueRepository.findByTicketIdAndFieldId(saved.getId(), f.getId());
                    if (val == null || String.valueOf(val).trim().isEmpty()) {
                        if (Boolean.TRUE.equals(f.getRequired()) && existingSubOpt.isEmpty()) {
                            throw new IllegalArgumentException("Required form field '" + f.getLabel() + "' is missing.");
                        }
                    } else {
                        validateSubmittedValue(f, val);
                    }
                }

                // 3. Persist update, insert, or clear operations
                for (FormField f : ticketTemplate.getFields()) {
                    Object val = findSubmittedValue(submittedFormValues, f);
                    Optional<FormSubmissionValue> existingSubOpt = formSubmissionValueRepository.findByTicketIdAndFieldId(saved.getId(), f.getId());

                    if (val != null && !String.valueOf(val).trim().isEmpty()) {
                        String strVal = String.valueOf(val).trim();
                        if (existingSubOpt.isPresent()) {
                            FormSubmissionValue sub = existingSubOpt.get();
                            sub.setValue(strVal);
                            formSubmissionValueRepository.save(sub);
                        } else {
                            FormSubmissionValue sub = new FormSubmissionValue(saved, f, strVal);
                            formSubmissionValueRepository.save(sub);
                        }
                    } else if (val != null && String.valueOf(val).trim().isEmpty() && existingSubOpt.isPresent()) {
                        FormSubmissionValue sub = existingSubOpt.get();
                        sub.setValue("");
                        formSubmissionValueRepository.save(sub);
                    }
                }
            }
        }

        // Record Audit Trail
        if (auditLogService != null) {
            try {
                String actionDesc = statusChanged 
                        ? "Ticket status updated from " + oldStatus + " to " + saved.getStatus().name()
                        : "Ticket #" + saved.getTicketNumber() + " modified";
                auditLogService.log(
                        actor,
                        saved.getCompany(),
                        "TICKET_UPDATED",
                        "TICKET",
                        saved.getId(),
                        actionDesc,
                        null
                );
            } catch (Exception e) {
                log.warn("Could not save audit log for ticket update: {}", e.getMessage());
            }
        }

        // Record Granular Ticket History (Priority 2.12)
        if (ticketHistoryService != null) {
            try {
                if (statusChanged) {
                    ticketHistoryService.recordChange(saved, "STATUS_CHANGED", "status", oldStatus, saved.getStatus().name(), actor);
                    if (saved.getStatus() == TicketStatus.CLOSED) {
                        ticketHistoryService.recordChange(saved, "CLOSED", "status", oldStatus, "CLOSED", actor);
                    }
                    if (("RESOLVED".equals(oldStatus) || "CLOSED".equals(oldStatus))
                            && (saved.getStatus() == TicketStatus.OPEN || saved.getStatus() == TicketStatus.IN_PROGRESS)) {
                        ticketHistoryService.recordChange(saved, "REOPENED", "status", oldStatus, saved.getStatus().name(), actor);
                    }
                }
                if (priorityChanged) {
                    ticketHistoryService.recordChange(saved, "PRIORITY_CHANGED", "priority", oldPriority != null ? oldPriority.name() : null, saved.getPriority().name(), actor);
                }
                if (agentChanged) {
                    String action = previousAgent == null ? "ASSIGNED" : "REASSIGNED";
                    String oldAgentName = previousAgent != null ? previousAgent.getName() : "Unassigned";
                    String newAgentName = saved.getAssignedTo() != null ? saved.getAssignedTo().getName() : "Unassigned";
                    ticketHistoryService.recordChange(saved, action, "assignedTo", oldAgentName, newAgentName, actor);
                }
                if (departmentChanged) {
                    ticketHistoryService.recordChange(saved, "DEPARTMENT_CHANGED", "department", oldDept, saved.getDepartment(), actor);
                }
                if (categoryChanged) {
                    String oldCatName = oldCat != null ? oldCat.getName() : null;
                    String newCatName = saved.getCategory() != null ? saved.getCategory().getName() : null;
                    ticketHistoryService.recordChange(saved, "CATEGORY_CHANGED", "category", oldCatName, newCatName, actor);
                }
                if (detailsChanged) {
                    ticketHistoryService.recordChange(saved, "UPDATED", "details", null, null, actor);
                }
            } catch (Exception e) {
                log.warn("Could not record ticket update history: {}", e.getMessage());
            }
        }

        // Real-time WebSocket Broadcast (Multi-Device Live Sync)
        if (messagingTemplate != null) {
            try {
                TicketResponse ticketDto = TicketResponse.from(saved);
                if (saved.getCompany() != null && saved.getCompany().getCompanyCode() != null) {
                    messagingTemplate.convertAndSend("/topic/tickets/" + saved.getCompany().getCompanyCode().toUpperCase(), ticketDto);
                }
                messagingTemplate.convertAndSend("/topic/tickets/" + saved.getId(), ticketDto);
            } catch (Exception e) {
                log.error("WebSocket ticket update broadcast error: {}", e.getMessage());
            }
        }

        // Notification & Email for Agent Assignment / Reassignment
        if (agentChanged && saved.getAssignedTo() != null) {
            try {
                String compCode = saved.getCompany() != null ? saved.getCompany().getCompanyCode() : "GLOBAL";
                User newAgent = saved.getAssignedTo();

                notificationService.saveNotification(
                        newAgent.getEmail(),
                        "Ticket Assigned: " + saved.getTicketNumber(),
                        "You have been assigned to ticket: " + saved.getSubject(),
                        "TICKET_ASSIGNED",
                        compCode,
                        "AGENT",
                        "/tickets/" + saved.getId()
                );
                emailService.sendTicketAssignedEmail(saved, saved.getCompany(), newAgent, actor);

                if (previousAgent != null && previousAgent.getEmail() != null && !previousAgent.getId().equals(newAgent.getId())) {
                    notificationService.saveNotification(
                            previousAgent.getEmail(),
                            "Ticket Reassigned: " + saved.getTicketNumber(),
                            "Ticket " + saved.getTicketNumber() + " was reassigned to " + newAgent.getName(),
                            "TICKET_REASSIGNED",
                            compCode,
                            "AGENT",
                            "/tickets/" + saved.getId()
                    );
                }
            } catch (Exception e) {
                log.error("Ticket assignment notification error: {}", e.getMessage());
            }
        }

        if (statusChanged) {
            try {
                emailService.sendTicketStatusUpdateNotification(
                        saved, 
                        saved.getCompany(), 
                        saved.getCreatedBy(), 
                        saved.getAssignedTo(), 
                        oldStatus, 
                        saved.getStatus().name()
                );

                if (saved.getCreatedBy() != null && saved.getCreatedBy().getEmail() != null) {
                    String compCode = saved.getCompany() != null ? saved.getCompany().getCompanyCode() : "GLOBAL";
                    notificationService.saveNotification(
                            saved.getCreatedBy().getEmail(),
                            "Status Updated: " + saved.getTicketNumber() + " is now " + saved.getStatus().name(),
                            "Your ticket '" + saved.getSubject() + "' status changed to " + saved.getStatus().name(),
                            "STATUS_UPDATE",
                            compCode,
                            "USER",
                            "/tickets/" + saved.getId()
                    );
                }

                if (saved.getStatus() == TicketStatus.RESOLVED || saved.getStatus() == TicketStatus.CLOSED) {
                    emailService.sendCsatSurveyEmail(
                            saved,
                            saved.getCompany(),
                            saved.getCreatedBy(),
                            saved.getAssignedTo()
                    );

                    if (saved.getCreatedBy() != null && saved.getCreatedBy().getEmail() != null) {
                        String compCode = saved.getCompany() != null ? saved.getCompany().getCompanyCode() : "GLOBAL";
                        notificationService.saveNotification(
                                saved.getCreatedBy().getEmail(),
                                "🌟 How was your support experience? (Ticket " + saved.getTicketNumber() + ")",
                                "Your ticket \"" + saved.getSubject() + "\" has been " + saved.getStatus().name().toLowerCase() + ". Please take a few seconds to rate our support!",
                                "CSAT_SURVEY",
                                compCode,
                                "USER",
                                "/tickets/" + saved.getId() + "?rate=5"
                        );
                    }
                }
            } catch (Exception e) {
                log.error("Email / CSAT dispatch error: {}", e.getMessage());
            }
        }

        return saved;
    }

    public Company getCompanyById(Long companyId) {
        return companyRepository.findById(companyId).orElse(null);
    }

    /**
     * Soft-deletes a ticket to preserve audit history and relational integrity.
     */
    @Transactional
    public void deleteTicket(Long id, Long companyId, Role userRole, User actor) {
        if (userRole != Role.SUPER_ADMIN && userRole != Role.COMPANY_ADMIN && userRole != Role.MANAGER) {
            throw new SecurityException("Only administrators and managers have permission to delete tickets.");
        }
        Ticket ticket = ticketRepository.findById(id).orElse(null);
        if (ticket == null) return;
        if (userRole != Role.SUPER_ADMIN && companyId != null && ticket.getCompany() != null && !companyId.equals(ticket.getCompany().getId())) {
            throw new SecurityException("Unauthorized ticket deletion: cross-tenant access denied.");
        }

        // Soft delete: marks ticket as deleted without deleting comments or attachments
        ticket.setDeleted(true);
        ticket.setDeletedAt(LocalDateTime.now());
        ticket.setDeletedBy(actor);
        ticketRepository.save(ticket);

        // Record Audit Trail
        if (auditLogService != null) {
            try {
                auditLogService.log(
                        actor,
                        ticket.getCompany(),
                        "TICKET_DELETED",
                        "TICKET",
                        ticket.getId(),
                        "Ticket #" + ticket.getTicketNumber() + " soft-deleted",
                        null
                );
            } catch (Exception e) {
                log.warn("Could not save audit log for ticket deletion: {}", e.getMessage());
            }
        }

        // Record Ticket History
        if (ticketHistoryService != null) {
            try {
                ticketHistoryService.recordChange(ticket, "TICKET_DELETED", "deleted", "false", "true", actor);
            } catch (Exception e) {
                log.warn("Could not record ticket deletion history: {}", e.getMessage());
            }
        }

        if (messagingTemplate != null && ticket.getCompany() != null) {
            try {
                messagingTemplate.convertAndSend("/topic/tickets/" + ticket.getCompany().getCompanyCode().toUpperCase() + "/deleted", id);
            } catch (Exception ignored) {}
        }
    }

    @Transactional
    public void deleteTicket(Long id, Long companyId, Role userRole) {
        deleteTicket(id, companyId, userRole, null);
    }

    /**
     * Restores a soft-deleted ticket.
     */
    @Transactional
    public Ticket restoreTicket(Long id, Long companyId, Role userRole, User actor) {
        if (userRole != Role.SUPER_ADMIN && userRole != Role.COMPANY_ADMIN) {
            throw new SecurityException("Only company administrators or super administrators can restore tickets.");
        }

        Ticket ticket = ticketRepository.findRawById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + id));

        if (userRole != Role.SUPER_ADMIN && companyId != null && ticket.getCompany() != null && !companyId.equals(ticket.getCompany().getId())) {
            throw new SecurityException("Unauthorized ticket restore: cross-tenant access denied.");
        }

        ticketRepository.restoreTicketById(id);
        ticket.setDeleted(false);
        ticket.setDeletedAt(null);
        ticket.setDeletedBy(null);

        if (auditLogService != null) {
            try {
                auditLogService.log(
                        actor,
                        ticket.getCompany(),
                        "TICKET_RESTORED",
                        "TICKET",
                        ticket.getId(),
                        "Ticket #" + ticket.getTicketNumber() + " restored",
                        null
                );
            } catch (Exception e) {
                log.warn("Could not save audit log for ticket restore: {}", e.getMessage());
            }
        }

        if (ticketHistoryService != null) {
            try {
                ticketHistoryService.recordChange(ticket, "TICKET_RESTORED", "deleted", "true", "false", actor);
            } catch (Exception e) {
                log.warn("Could not record ticket restore history: {}", e.getMessage());
            }
        }

        return ticket;
    }

    private String generateTicketNumber(String companyCode) {
        String prefix = (companyCode != null && !companyCode.isBlank()) ? companyCode.trim().toUpperCase() : "TK";
        for (int attempts = 0; attempts < 10; attempts++) {
            long timeSuffix = System.currentTimeMillis() % 100000;
            int randomNum = 1000 + secureRandom.nextInt(9000);
            String candidate = "#" + prefix + "-" + timeSuffix + "-" + randomNum;
            if (!ticketRepository.existsByTicketNumber(candidate)) {
                return candidate;
            }
        }
        return "#" + prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
