package com.ticketpro.api;

import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class DatabaseIntegrityTest {

    static {
        TicketProApplication.loadEnv();
    }

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private KnowledgeBaseRepository knowledgeBaseRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PasswordResetOtpRepository passwordResetOtpRepository;

    @Autowired
    private SlaPolicyRepository slaPolicyRepository;

    @Test
    void testAllRepositoriesAreLoaded() {
        assertNotNull(companyRepository, "CompanyRepository must be loaded");
        assertNotNull(userRepository, "UserRepository must be loaded");
        assertNotNull(ticketRepository, "TicketRepository must be loaded");
        assertNotNull(commentRepository, "CommentRepository must be loaded");
        assertNotNull(attachmentRepository, "AttachmentRepository must be loaded");
        assertNotNull(feedbackRepository, "FeedbackRepository must be loaded");
        assertNotNull(departmentRepository, "DepartmentRepository must be loaded");
        assertNotNull(categoryRepository, "CategoryRepository must be loaded");
        assertNotNull(announcementRepository, "AnnouncementRepository must be loaded");
        assertNotNull(knowledgeBaseRepository, "KnowledgeBaseRepository must be loaded");
        assertNotNull(notificationRepository, "NotificationRepository must be loaded");
        assertNotNull(auditLogRepository, "AuditLogRepository must be loaded");
        assertNotNull(passwordResetOtpRepository, "PasswordResetOtpRepository must be loaded");
        assertNotNull(slaPolicyRepository, "SlaPolicyRepository must be loaded");
    }

    @Test
    void testCompaniesAndTenancy() {
        List<Company> companies = companyRepository.findAll();
        assertFalse(companies.isEmpty(), "There should be active companies in the DB");

        for (Company c : companies) {
            assertNotNull(c.getId());
            assertNotNull(c.getCompanyCode());
            assertNotNull(c.getStatus(), "Company status must not be null");

            // Test query method
            Optional<Company> found = companyRepository.findByCompanyCodeIgnoreCase(c.getCompanyCode());
            assertTrue(found.isPresent(), "Should find company by case-insensitive code: " + c.getCompanyCode());
        }
    }

    @Test
    void testUsersAndRoles() {
        List<User> users = userRepository.findAll();
        assertFalse(users.isEmpty(), "There should be users in the DB");

        boolean hasSuperAdmin = false;
        for (User u : users) {
            assertNotNull(u.getId());
            assertNotNull(u.getEmail());
            assertNotNull(u.getName());
            assertNotNull(u.getRole());
            assertNotNull(u.getPassword());

            if (u.getRole() == Role.SUPER_ADMIN) {
                hasSuperAdmin = true;
                assertNull(u.getCompany(), "SUPER_ADMIN should have company = null");
            } else {
                assertNotNull(u.getCompany(), "Tenant users must be linked to a company: " + u.getEmail());
            }

            Optional<User> byEmail = userRepository.findByEmail(u.getEmail());
            assertTrue(byEmail.isPresent(), "User should be queryable by email: " + u.getEmail());
        }
        assertTrue(hasSuperAdmin, "SUPER_ADMIN must exist in the database");
    }

    @Test
    void testTicketsIntegrity() {
        List<Ticket> tickets = ticketRepository.findAll();
        for (Ticket t : tickets) {
            assertNotNull(t.getId());
            assertNotNull(t.getTicketNumber());
            assertNotNull(t.getCompany());
            assertNotNull(t.getCreatedBy());
            assertNotNull(t.getStatus());
            assertNotNull(t.getPriority());

            Optional<Ticket> byNum = ticketRepository.findByTicketNumber(t.getTicketNumber());
            assertTrue(byNum.isPresent(), "Should find ticket by ticket number: " + t.getTicketNumber());
        }
    }

    @Test
    void testDepartmentsAndCategories() {
        List<Department> departments = departmentRepository.findAll();
        assertFalse(departments.isEmpty(), "Departments must exist");
        for (Department d : departments) {
            assertNotNull(d.getName());
            assertNotNull(d.getStatus());
        }

        List<Category> categories = categoryRepository.findAll();
        assertFalse(categories.isEmpty(), "Categories must exist");
        for (Category cat : categories) {
            assertNotNull(cat.getName());
            assertNotNull(cat.getCompany());
            assertEquals(CategoryStatus.ACTIVE, cat.getStatus());
        }
    }

    @Test
    void testFeedbacksAndCsatQueries() {
        List<Feedback> feedbacks = feedbackRepository.findAll();
        for (Feedback fb : feedbacks) {
            assertNotNull(fb.getId());
            assertNotNull(fb.getTicket());
            assertNotNull(fb.getCompany());
            assertTrue(fb.getRating() >= 1 && fb.getRating() <= 5);
        }

        // Test custom aggregate queries
        Double globalAvg = feedbackRepository.getGlobalAverageRating();
        if (!feedbacks.isEmpty()) {
            assertNotNull(globalAvg);
            assertTrue(globalAvg >= 1.0 && globalAvg <= 5.0);
        }
    }

    @Test
    @Transactional
    void testSlaPolicyLifecycle() {
        Company comp = companyRepository.findAll().get(0);
        SlaPolicy policy = new SlaPolicy(comp, "Test SLA Policy", Priority.CRITICAL, 15, 60, SlaStatus.ACTIVE);
        SlaPolicy saved = slaPolicyRepository.save(policy);
        assertNotNull(saved.getId());

        Optional<SlaPolicy> fetched = slaPolicyRepository.findByCompanyIdAndPriority(comp.getId(), Priority.CRITICAL);
        assertTrue(fetched.isPresent());
        assertEquals("Test SLA Policy", fetched.get().getName());

        slaPolicyRepository.delete(saved);
        Optional<SlaPolicy> afterDelete = slaPolicyRepository.findById(saved.getId());
        assertFalse(afterDelete.isPresent());
    }

    @Test
    @Transactional
    void testAnnouncementLifecycle() {
        Company comp = companyRepository.findAll().get(0);
        User user = userRepository.findByCompanyId(comp.getId()).get(0);

        Announcement ann = new Announcement();
        ann.setCompany(comp);
        ann.setCreatedBy(user);
        ann.setTitle("System Maintenance Notice");
        ann.setMessage("Scheduled maintenance at midnight.");
        ann.setStatus(AnnouncementStatus.ACTIVE);

        Announcement saved = announcementRepository.save(ann);
        assertNotNull(saved.getId());

        List<Announcement> list = announcementRepository.findByCompanyId(comp.getId());
        assertFalse(list.isEmpty());

        announcementRepository.delete(saved);
    }

    @Test
    @Transactional
    void testKnowledgeBaseLifecycle() {
        Company comp = companyRepository.findAll().get(0);
        User user = userRepository.findByCompanyId(comp.getId()).get(0);

        KnowledgeBase kb = new KnowledgeBase();
        kb.setCompany(comp);
        kb.setCreatedBy(user);
        kb.setTitle("How to reset password");
        kb.setContent("Steps to reset your portal password...");
        kb.setStatus(KbStatus.PUBLISHED);

        KnowledgeBase saved = knowledgeBaseRepository.save(kb);
        assertNotNull(saved.getId());

        List<KnowledgeBase> list = knowledgeBaseRepository.findByCompanyId(comp.getId());
        assertFalse(list.isEmpty());

        knowledgeBaseRepository.delete(saved);
    }

    @Test
    @Transactional
    void testAttachmentLifecycle() {
        Ticket ticket = ticketRepository.findAll().get(0);
        User user = userRepository.findAll().get(0);

        Attachment att = new Attachment(ticket, user, "test_screenshot.png", "/api/attachments/download/test.png", "image/png", 1024L);
        Attachment saved = attachmentRepository.save(att);
        assertNotNull(saved.getId());

        List<Attachment> found = attachmentRepository.findByTicketId(ticket.getId());
        assertFalse(found.isEmpty());

        attachmentRepository.delete(saved);
    }

    @Test
    @Transactional
    void testCommentLifecycle() {
        Ticket ticket = ticketRepository.findAll().get(0);
        User user = userRepository.findAll().get(0);

        Comment comment = new Comment();
        comment.setTicket(ticket);
        comment.setUser(user);
        comment.setComment("Automated integration test verification comment.");
        comment.setInternal(false);

        Comment saved = commentRepository.save(comment);
        assertNotNull(saved.getId());

        List<Comment> comments = commentRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId());
        assertFalse(comments.isEmpty());

        commentRepository.delete(saved);
    }

    @Test
    @Transactional
    void testNotificationsAndOtp() {
        Notification notif = new Notification("user@test.com", "Alert", "Test alert", "INFO", "HDFCBANK", "AGENT", "/tickets");
        Notification savedNotif = notificationRepository.save(notif);
        assertNotNull(savedNotif.getId());

        long unread = notificationRepository.countByRecipientEmailAndReadFalse("user@test.com");
        assertEquals(1, unread);
        notificationRepository.delete(savedNotif);

        PasswordResetOtp otp = PasswordResetOtp.builder()
                .email("test_otp@test.com")
                .otp("654321")
                .used(false)
                .build();
        PasswordResetOtp savedOtp = passwordResetOtpRepository.save(otp);
        assertNotNull(savedOtp.getId());

        Optional<PasswordResetOtp> fetchedOtp = passwordResetOtpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test_otp@test.com");
        assertTrue(fetchedOtp.isPresent());
        assertEquals("654321", fetchedOtp.get().getOtp());

        passwordResetOtpRepository.delete(savedOtp);
    }
}
