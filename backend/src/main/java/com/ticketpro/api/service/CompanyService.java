package com.ticketpro.api.service;

import com.ticketpro.api.dto.CompanyRegisterRequest;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final CommentRepository commentRepository;
    private final CategoryRepository categoryRepository;
    private final SlaPolicyRepository slaPolicyRepository;
    private final AnnouncementRepository announcementRepository;
    private final KnowledgeBaseRepository kbRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Autowired(required = false)
    private AttachmentRepository attachmentRepository;

    @Autowired(required = false)
    private FeedbackRepository feedbackRepository;

    @Autowired(required = false)
    private DepartmentRepository departmentRepository;

    @Autowired(required = false)
    private AuditLogRepository auditLogRepository;

    @Autowired(required = false)
    private NotificationRepository notificationRepository;

    public CompanyService(CompanyRepository companyRepository,
                          UserRepository userRepository,
                          TicketRepository ticketRepository,
                          CommentRepository commentRepository,
                          CategoryRepository categoryRepository,
                          SlaPolicyRepository slaPolicyRepository,
                          AnnouncementRepository announcementRepository,
                          KnowledgeBaseRepository kbRepository,
                          PasswordEncoder passwordEncoder,
                          EmailService emailService,
                          AuditLogService auditLogService,
                          NotificationService notificationService) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
        this.commentRepository = commentRepository;
        this.categoryRepository = categoryRepository;
        this.slaPolicyRepository = slaPolicyRepository;
        this.announcementRepository = announcementRepository;
        this.kbRepository = kbRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    public List<Company> getAllCompanies() {
        return companyRepository.findAll();
    }

    public Company getCompanyById(Long id) {
        return companyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + id));
    }

    @Transactional
    public Company saveCompany(Company company) {
        Company saved = companyRepository.save(company);
        auditLogService.log(null, saved, "COMPANY_CREATED", "COMPANY", saved.getId(), "Company onboarded: " + saved.getCompanyName(), null);
        return saved;
    }

    public Optional<Company> findByCompanyCode(String companyCode) {
        return companyRepository.findByCompanyCode(companyCode);
    }

    @Transactional
    public Company updateCompany(Long id, com.ticketpro.api.dto.CompanyUpdateRequest request) {
        Company company = getCompanyById(id);
        CompanyStatus oldStatus = company.getStatus();
        boolean statusChangedToActive = oldStatus != CompanyStatus.ACTIVE && request.getStatus() == CompanyStatus.ACTIVE;

        if (request.getCompanyName() != null) company.setCompanyName(request.getCompanyName());
        if (request.getEmail() != null) company.setEmail(request.getEmail());
        if (request.getPhone() != null) company.setPhone(request.getPhone());
        if (request.getAddress() != null) company.setAddress(request.getAddress());
        if (request.getWebsite() != null) company.setWebsite(request.getWebsite());
        if (request.getCustomFields() != null) company.setCustomFields(request.getCustomFields());
        if (request.getStatus() != null) company.setStatus(request.getStatus());

        Company saved = companyRepository.save(company);

        // Audit Log Entry
        String desc = "Super Admin / Admin updated company configuration for: " + saved.getCompanyName();
        if (request.getStatus() != null && request.getStatus() != oldStatus) {
            desc += " (Status changed: " + oldStatus + " -> " + request.getStatus() + ")";
        }
        auditLogService.log(null, saved, "COMPANY_UPDATED", "COMPANY", saved.getId(), desc, null);

        // Dispatch Real-Time Notification to Company Admin
        notificationService.saveNotification(
                saved.getEmail(),
                "🏢 Company Profile Updated",
                "Your company workspace configuration or status was updated by Super Admin.",
                "SYSTEM_ALERT",
                saved.getCompanyCode(),
                "COMPANY_ADMIN",
                "/profile"
        );

        if (statusChangedToActive) {
            try {
                emailService.sendCompanyApprovedEmail(saved, saved.getEmail(), saved.getCompanyName() + " Admin");
            } catch (Exception e) {
                log.error("Failed to send company approval email for company '{}': {}", saved.getCompanyName(), e.getMessage(), e);
            }
        }

        return saved;
    }

    @Transactional
    public void deleteCompany(Long id) {
        Company company = getCompanyById(id);

        // 1. Cascade delete tickets & children
        List<Ticket> tickets = ticketRepository.findByCompanyId(id);
        for (Ticket t : tickets) {
            commentRepository.deleteAll(commentRepository.findByTicketIdOrderByCreatedAtAsc(t.getId()));
            if (attachmentRepository != null) {
                List<Attachment> atts = attachmentRepository.findByTicketId(t.getId());
                if (atts != null && !atts.isEmpty()) {
                    attachmentRepository.deleteAll(atts);
                }
            }
            if (feedbackRepository != null) {
                feedbackRepository.findByTicketId(t.getId()).ifPresent(feedbackRepository::delete);
            }
        }
        ticketRepository.deleteAll(tickets);

        // 2. Cascade delete Announcements & KB
        announcementRepository.deleteAll(announcementRepository.findByCompanyId(id));
        kbRepository.deleteAll(kbRepository.findByCompanyId(id));

        // 3. Cascade delete SLA Policies & Categories & Departments
        slaPolicyRepository.deleteAll(slaPolicyRepository.findByCompanyId(id));
        categoryRepository.deleteAll(categoryRepository.findByCompanyId(id));
        if (departmentRepository != null) {
            departmentRepository.deleteAll(departmentRepository.findByCompanyId(id));
        }

        // 4. Cascade delete Users & notifications
        List<User> users = userRepository.findByCompanyId(id);
        for (User u : users) {
            if (notificationRepository != null && u.getEmail() != null) {
                notificationRepository.deleteByRecipientEmail(u.getEmail());
            }
        }
        userRepository.deleteAll(users);

        // 5. Cascade delete Feedback & Audit Logs
        if (feedbackRepository != null) {
            feedbackRepository.deleteAll(feedbackRepository.findByCompanyIdOrderByCreatedAtDesc(id));
        }
        if (auditLogRepository != null) {
            auditLogRepository.deleteAll(auditLogRepository.findByCompanyIdOrderByCreatedAtDesc(id));
        }

        // 6. Delete the company record completely
        companyRepository.delete(company);
    }

    public User getCompanyAdmin(Long companyId) {
        return userRepository.findByCompanyIdAndRole(companyId, Role.COMPANY_ADMIN).stream()
                .findFirst()
                .orElse(null);
    }

    @Transactional
    public User setCompanyAdmin(Long companyId, String name, String email, String password) {
        Company company = getCompanyById(companyId);
        User existingAdmin = getCompanyAdmin(companyId);
        if (existingAdmin != null) {
            if (name != null && !name.isBlank()) existingAdmin.setName(name);
            if (email != null && !email.isBlank()) existingAdmin.setEmail(email);
            if (password != null && !password.isBlank()) existingAdmin.setPassword(passwordEncoder.encode(password));
            return userRepository.save(existingAdmin);
        } else {
            User newAdmin = new User();
            newAdmin.setName(name != null && !name.isBlank() ? name : company.getCompanyName() + " Admin");
            newAdmin.setEmail(email != null && !email.isBlank() ? email : company.getEmail());
            String initialPassword = (password != null && !password.isBlank())
                    ? password
                    : java.util.UUID.randomUUID().toString().replace("-", "") + "Aa1!";
            newAdmin.setPassword(passwordEncoder.encode(initialPassword));
            if (password == null || password.isBlank()) {
                newAdmin.setPasswordResetRequired(true);
            }
            newAdmin.setRole(Role.COMPANY_ADMIN);
            newAdmin.setStatus(UserStatus.ACTIVE);
            newAdmin.setCompany(company);
            return userRepository.save(newAdmin);
        }
    }

    @Transactional
    public Company registerCompany(CompanyRegisterRequest request) {
        String companyName = request.getCompanyName();
        if (companyName == null || companyName.isBlank()) {
            throw new IllegalArgumentException("Company name is required.");
        }

        String code = request.getCompanyCode();
        if (code == null || code.isBlank()) {
            code = companyName.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            if (code.length() > 8) code = code.substring(0, 8);
        } else {
            code = code.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
        }
        if (code.isBlank()) {
            code = "COMP" + (System.currentTimeMillis() % 10000);
        }

        Optional<Company> existingCompOpt = companyRepository.findByCompanyCodeIgnoreCase(code);
        Company company;
        if (existingCompOpt.isPresent()) {
            Company existing = existingCompOpt.get();
            if (existing.getStatus() == CompanyStatus.PENDING) {
                company = existing;
            } else {
                code = code + (System.currentTimeMillis() % 1000);
                company = new Company();
            }
        } else {
            company = new Company();
        }

        company.setCompanyName(companyName);
        company.setCompanyCode(code);
        company.setEmail(request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail() : (code.toLowerCase() + "@ticketpro.local"));
        if (request.getPhone() != null && !request.getPhone().isBlank()) company.setPhone(request.getPhone());
        if (request.getAddress() != null && !request.getAddress().isBlank()) company.setAddress(request.getAddress());
        if (request.getWebsite() != null && !request.getWebsite().isBlank()) company.setWebsite(request.getWebsite());
        company.setStatus(CompanyStatus.PENDING);

        // Prepare customFields with logoUrl
        String customFields = request.getCustomFields();
        if (request.getLogoUrl() != null && !request.getLogoUrl().isBlank()) {
            if (customFields == null || customFields.isBlank()) {
                customFields = "{\"logoUrl\":\"" + request.getLogoUrl().replace("\"", "\\\"") + "\"}";
            } else if (!customFields.contains("\"logoUrl\"")) {
                int lastBrace = customFields.lastIndexOf('}');
                if (lastBrace > 0) {
                    customFields = customFields.substring(0, lastBrace) + ",\"logoUrl\":\"" + request.getLogoUrl().replace("\"", "\\\"") + "\"}";
                }
            }
        }
        if (customFields != null) {
            company.setCustomFields(customFields);
        }

        Company savedCompany = companyRepository.save(company);

        // Admin User setup
        String adminEmail = request.getAdminEmail();
        if (adminEmail == null || adminEmail.isBlank()) {
            adminEmail = "admin@" + code.toLowerCase() + ".ticketpro.com";
        }
        String adminPass = request.getAdminPassword();
        if (adminPass == null || adminPass.isBlank()) {
            adminPass = "Admin@" + code + "2026";
        }

        Optional<User> existingUserOpt = userRepository.findByEmail(adminEmail);
        User admin;
        if (existingUserOpt.isPresent()) {
            admin = existingUserOpt.get();
            admin.setCompany(savedCompany);
            if (request.getAdminName() != null && !request.getAdminName().isBlank()) {
                admin.setName(request.getAdminName());
            }
            admin.setPassword(passwordEncoder.encode(adminPass));
            admin.setRole(Role.COMPANY_ADMIN);
            admin.setStatus(UserStatus.ACTIVE);
            if (request.getAdminPhone() != null) admin.setPhone(request.getAdminPhone());
            userRepository.save(admin);
        } else {
            admin = new User();
            admin.setCompany(savedCompany);
            admin.setName(request.getAdminName() != null && !request.getAdminName().isBlank() ? request.getAdminName() : companyName + " Admin");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPass));
            admin.setPhone(request.getAdminPhone() != null ? request.getAdminPhone() : request.getPhone());
            admin.setRole(Role.COMPANY_ADMIN);
            admin.setStatus(UserStatus.ACTIVE);
            userRepository.save(admin);
        }

        // Audit Log Entry
        try {
            auditLogService.log(null, savedCompany, "COMPANY_REGISTER_REQUEST", "COMPANY", savedCompany.getId(),
                    "New company onboarding registration submitted: " + savedCompany.getCompanyName() + " (" + savedCompany.getCompanyCode() + ")", null);
        } catch (Exception e) {
            log.warn("Failed to write audit log for onboarding: {}", e.getMessage());
        }

        // Notify Super Admin via WebSocket and in-app notification
        try {
            notificationService.saveNotification(
                    "superadmin@ticketpro.com",
                    "🏢 New Company Onboarding Request: " + savedCompany.getCompanyName(),
                    "Company '" + savedCompany.getCompanyName() + "' (" + savedCompany.getCompanyCode() + ") has submitted an onboarding registration. Admin: " + admin.getName() + " (" + admin.getEmail() + "). Approval required.",
                    "COMPANY_ONBOARDING",
                    "GLOBAL",
                    "SUPER_ADMIN",
                    "/companies"
            );
        } catch (Exception e) {
            log.warn("Failed to dispatch super admin notification for onboarding: {}", e.getMessage());
        }

        return savedCompany;
    }
}
