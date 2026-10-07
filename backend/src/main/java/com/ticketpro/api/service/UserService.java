package com.ticketpro.api.service;

import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.UserRequest;
import com.ticketpro.api.dto.outpost.AnchorUserRequest;
import com.ticketpro.api.entity.Comment;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.entity.UserStatus;
import com.ticketpro.api.repository.CommentRepository;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.NotificationRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import com.ticketpro.api.service.outpost.MapplsAnchorClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Service
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final TicketRepository ticketRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private CommentRepository commentRepository;

    @Autowired(required = false)
    private CompanyRepository companyRepository;

    @Autowired(required = false)
    private MapplsAnchorClient mapplsAnchorClient;

    @Autowired(required = false)
    private OutpostProperties outpostProperties;

    public UserService(UserRepository userRepository,
                       TicketRepository ticketRepository,
                       NotificationRepository notificationRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.ticketRepository = ticketRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Page<User> getAllUsersPaged(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    public List<User> getUsersByCompany(Long companyId) {
        return userRepository.findByCompanyId(companyId);
    }

    public Page<User> getUsersByCompanyPaged(Long companyId, Pageable pageable) {
        return userRepository.findByCompanyId(companyId, pageable);
    }

    public List<User> getAgentsByCompany(Long companyId) {
        return userRepository.findByCompanyIdAndRole(companyId, Role.AGENT);
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));
    }

    @Transactional
    public User createUser(UserRequest request, Company company) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already in use: " + request.getEmail());
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        Role requestedRole = request.getRole() != null ? request.getRole() : Role.END_USER;
        // SECURITY: Prevent creating SUPER_ADMIN users under a company tenant
        if (requestedRole == Role.SUPER_ADMIN && company != null) {
            throw new SecurityException("Cannot create SUPER_ADMIN users under a company tenant.");
        }
        user.setRole(requestedRole);
        user.setStatus(request.getStatus() != null ? request.getStatus() : UserStatus.ACTIVE);
        user.setCompany(company);
        user.setPhone(request.getPhone());
        user.setDepartment(request.getDepartment());

        User savedUser = userRepository.save(user);

        // Optional Mappls Anchor synchronization
        boolean shouldSync = Boolean.TRUE.equals(request.getSyncToAnchor()) ||
                (outpostProperties != null && outpostProperties.isAnchorSyncEnabled());

        if (shouldSync && mapplsAnchorClient != null) {
            try {
                String usernamesws = (request.getUsernamesws() != null && !request.getUsernamesws().isBlank())
                        ? request.getUsernamesws()
                        : request.getEmail();

                AnchorUserRequest anchorRequest = AnchorUserRequest.builder()
                        .name(request.getName())
                        .usernamesws(usernamesws)
                        .email(request.getEmail())
                        .password(request.getPassword())
                        .build();

                mapplsAnchorClient.createUser(anchorRequest);
                log.info("Successfully requested Mappls Anchor user creation for: {}", request.getEmail());
            } catch (Exception e) {
                log.warn("Non-fatal: Failed to sync user to Mappls Anchor for {}: {}", request.getEmail(), e.getMessage());
            }
        }

        return savedUser;
    }

    @Transactional
    public User updateUser(Long id, UserRequest request, Long companyId, Role role, Long currentUserId) {
        User user = getUserById(id);

        // SECURITY C-1: Block non-SUPER_ADMIN from modifying SUPER_ADMIN accounts
        if (user.getRole() == Role.SUPER_ADMIN && role != Role.SUPER_ADMIN) {
            throw new SecurityException("Only Super Admin can modify Super Admin accounts.");
        }

        // Authorization check: non-super-admins can only update users belonging to their own company
        if (role != Role.SUPER_ADMIN) {
            if (user.getCompany() == null) {
                // Target has no company (platform-level user) — only SUPER_ADMIN can modify
                throw new SecurityException("Unauthorized to update platform-level user.");
            }
            if (companyId != null && !user.getCompany().getId().equals(companyId)) {
                throw new SecurityException("Unauthorized to update user outside your company.");
            }
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName().trim());
        }

        // Properly update email and check for uniqueness
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                userRepository.findByEmail(newEmail).ifPresent(existing -> {
                    if (!existing.getId().equals(user.getId())) {
                        throw new IllegalArgumentException("Email already in use: " + newEmail);
                    }
                });
                user.setEmail(newEmail);
            }
        }

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }

        if (request.getDepartment() != null) {
            user.setDepartment(request.getDepartment().trim());
        }

        // SECURITY C-2: Restrict role assignment — COMPANY_ADMIN cannot assign SUPER_ADMIN
        if (request.getRole() != null && (role == Role.SUPER_ADMIN || role == Role.COMPANY_ADMIN)) {
            if (role == Role.COMPANY_ADMIN && request.getRole() == Role.SUPER_ADMIN) {
                throw new SecurityException("Company Admin cannot assign SUPER_ADMIN role.");
            }
            user.setRole(request.getRole());
        }

        // SECURITY: Only SUPER_ADMIN or COMPANY_ADMIN can change user status
        if (request.getStatus() != null && (role == Role.SUPER_ADMIN || role == Role.COMPANY_ADMIN)) {
            user.setStatus(request.getStatus());
        }

        // Allow super admin to update company
        if (role == Role.SUPER_ADMIN && request.getCompanyId() != null && companyRepository != null) {
            if (request.getCompanyId() > 0) {
                companyRepository.findById(request.getCompanyId()).ifPresent(user::setCompany);
            } else {
                user.setCompany(null);
            }
        }

        // SECURITY C-1: Password changes require SUPER_ADMIN, COMPANY_ADMIN (for tenant users), or self-update only
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            boolean isSelf = currentUserId != null && currentUserId.equals(user.getId());
            boolean isSuperAdmin = role == Role.SUPER_ADMIN;
            boolean isCompanyAdmin = role == Role.COMPANY_ADMIN;

            if (!isSuperAdmin && !isCompanyAdmin && !isSelf) {
                throw new SecurityException("Cannot change another user's password. Only administrators or the account owner can do this.");
            }
            user.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }

        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = getUserById(id);

        // Disassociate assigned tickets to preserve history
        List<Ticket> assignedTickets = ticketRepository.findByAssignedToId(id);
        for (Ticket t : assignedTickets) {
            t.setAssignedTo(null);
            ticketRepository.save(t);
        }

        // Clean user notifications
        if (user.getEmail() != null) {
            notificationRepository.deleteByRecipientEmail(user.getEmail());
        }

        if (commentRepository != null) {
            List<Comment> comments = commentRepository.findByUserId(id);
            if (comments != null && !comments.isEmpty()) {
                commentRepository.deleteAll(comments);
            }
        }

        userRepository.delete(user);
    }

    @Transactional
    public void deleteUser(Long id, Long companyId, Role role) {
        if (role != Role.SUPER_ADMIN && role != Role.COMPANY_ADMIN) {
            throw new SecurityException("Only company administrators have permission to delete team members.");
        }
        User user = getUserById(id);
        if (role != Role.SUPER_ADMIN && (user.getCompany() == null || !user.getCompany().getId().equals(companyId))) {
            throw new SecurityException("Unauthorized to delete user outside your company.");
        }

        // Disassociate assigned tickets to preserve history
        List<Ticket> assignedTickets = ticketRepository.findByAssignedToId(id);
        for (Ticket t : assignedTickets) {
            t.setAssignedTo(null);
            ticketRepository.save(t);
        }

        // Clean user notifications
        if (user.getEmail() != null) {
            notificationRepository.deleteByRecipientEmail(user.getEmail());
        }

        if (commentRepository != null) {
            List<Comment> comments = commentRepository.findByUserId(id);
            if (comments != null && !comments.isEmpty()) {
                commentRepository.deleteAll(comments);
            }
        }

        userRepository.delete(user);
    }

    @Transactional
    public User restoreUser(Long id, Long companyId, Role role) {
        User user = getUserById(id);
        if (role != Role.SUPER_ADMIN && (user.getCompany() == null || !user.getCompany().getId().equals(companyId))) {
            throw new SecurityException("Unauthorized to restore user outside your company.");
        }
        user.setStatus(UserStatus.ACTIVE);
        return userRepository.save(user);
    }
}
