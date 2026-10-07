package com.ticketpro.api.service;

import com.ticketpro.api.dto.CompanyRegisterRequest;
import com.ticketpro.api.dto.LoginRequest;
import com.ticketpro.api.dto.LoginResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.CompanyStatus;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.entity.UserStatus;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.UserRepository;
import com.ticketpro.api.entity.PasswordResetOtp;
import com.ticketpro.api.repository.PasswordResetOtpRepository;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.outpost.OutpostAuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.regex.Pattern;

@Slf4j
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OutpostAuthService outpostAuthService;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final EmailService emailService;
    private final LoginAttemptService loginAttemptService;

    private static final Pattern PASSWORD_PATTERN = 
            Pattern.compile("^(?=.*[0-9])(?=.*[a-zA-Z]).{8,}$");

    public AuthService(AuthenticationManager authenticationManager,
                       CompanyRepository companyRepository,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       OutpostAuthService outpostAuthService,
                       PasswordResetOtpRepository passwordResetOtpRepository,
                       EmailService emailService,
                       LoginAttemptService loginAttemptService) {
        this.authenticationManager = authenticationManager;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.outpostAuthService = outpostAuthService;
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.emailService = emailService;
        this.loginAttemptService = loginAttemptService;
    }

    @Transactional
    public LoginResponse authenticate(LoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";

        // 1. Check persistent lockout before proceeding with authentication
        loginAttemptService.checkLockout(email);

        // 2. Authenticate user credentials.
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
            // Reset failed attempt counter on successful login
            loginAttemptService.resetAttempts(email);
        } catch (org.springframework.security.core.AuthenticationException authEx) {
            // Record failed attempt in persistent DB store (locks account after 5 attempts)
            loginAttemptService.recordFailedAttempt(email);
            throw authEx;
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        // Enforce forced password reset if required (e.g. for temporary accounts)
        if (Boolean.TRUE.equals(user.getPasswordResetRequired())) {
            throw new IllegalStateException("Password reset is required on first login. Please use the Forgot Password OTP verification flow to set your permanent credentials.");
        }
        // Enforce user account status check (Soft-Deleted or blocked users cannot log in)
        if (user.getStatus() == UserStatus.INACTIVE || user.getStatus() == UserStatus.BLOCKED) {
            throw new IllegalStateException("Your account has been deactivated. Please contact your company administrator.");
        }
        if (user.getStatus() == UserStatus.PENDING) {
            throw new IllegalStateException("Your account registration is pending administrator approval.");
        }

        // Enforce Super Admin approval workflow: Block login if company is PENDING, REJECTED, or SUSPENDED
        if (user.getRole() != Role.SUPER_ADMIN) {
            Company company = user.getCompany();
            if (company == null) {
                throw new IllegalStateException("User is not associated with any registered company.");
            }
            if (company.getStatus() == CompanyStatus.PENDING) {
                throw new IllegalStateException("Your company onboarding registration (" + company.getCompanyName() + ") is pending approval from Super Admin. Access is disabled until approved.");
            }
            if (company.getStatus() == CompanyStatus.REJECTED) {
                throw new IllegalStateException("Your company onboarding request was rejected by Super Admin.");
            }
            if (company.getStatus() == CompanyStatus.SUSPENDED) {
                throw new IllegalStateException("Your company account has been suspended or deactivated by Super Admin.");
            }
            if (company.getStatus() != CompanyStatus.ACTIVE) {
                throw new IllegalStateException("Company status is not active: " + company.getStatus());
            }
        }

        // Validate Company Code / Name if provided in login request
        if (request.getCompanyCode() != null && !request.getCompanyCode().trim().isBlank()) {
            String inputCode = request.getCompanyCode().trim();
            Optional<Company> matchedCompany = companyRepository.findByCompanyCodeIgnoreCase(inputCode);
            if (matchedCompany.isEmpty()) {
                matchedCompany = companyRepository.findByCompanyNameIgnoreCase(inputCode);
            }

            if (matchedCompany.isEmpty()) {
                throw new IllegalStateException("Company '" + inputCode + "' does not exist or has been deleted from Super Admin.");
            }

            Company reqCompany = matchedCompany.get();
            if (reqCompany.getStatus() != CompanyStatus.ACTIVE) {
                throw new IllegalStateException("Company '" + reqCompany.getCompanyName() + "' is " + reqCompany.getStatus() + ". Login is disabled.");
            }

            // Verify that the user's account belongs to the requested company
            if (user.getRole() == Role.SUPER_ADMIN) {
                throw new IllegalStateException("Super Admin account does not belong to company '" + reqCompany.getCompanyName() + "'. Please login through the dedicated Super Admin Portal.");
            } else if (user.getCompany() == null || !user.getCompany().getId().equals(reqCompany.getId())) {
                throw new IllegalStateException("Your account (" + user.getEmail() + ") does not belong to company '" + reqCompany.getCompanyName() + "'. Please check your company workspace code.");
            }
        }

        // ===================================================================
        // Outpost OAuth2 Token Generation:
        // Requests official access token from Outpost using configured credentials.
        // If Outpost has temporary network issues or bad credentials, gracefully falls back to session token.
        // ===================================================================
        String token = outpostAuthService.obtainTokenForUser(user.getEmail());

        Company company = userDetails.getUser().getCompany();
        Long companyId = company != null ? company.getId() : null;
        String companyName = company != null ? company.getCompanyName() : null;
        String companyCode = company != null ? company.getCompanyCode() : null;

        String logoUrl = "";
        String primaryColor = "#4f46e5";
        String customFieldsStr = company != null ? company.getCustomFields() : null;
        if (customFieldsStr != null && customFieldsStr.contains("logoUrl")) {
            try {
                com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(customFieldsStr);
                if (node.has("logoUrl")) logoUrl = node.get("logoUrl").asText("");
                if (node.has("primaryColor")) primaryColor = node.get("primaryColor").asText("#4f46e5");
            } catch (Exception ignored) {}
        }

        return new LoginResponse(
                token,
                userDetails.getId(),
                userDetails.getUser().getName(),
                userDetails.getUser().getEmail(),
                userDetails.getRole(),
                companyId,
                companyName,
                companyCode,
                logoUrl,
                primaryColor,
                customFieldsStr,
                true,
                token
        );
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long and include both letters and numbers.");
        }
        if (!PASSWORD_PATTERN.matcher(password).matches()) {
            throw new IllegalArgumentException("Password must contain at least 8 characters, including letters and numbers.");
        }
    }

    @Transactional
    public Company registerCompany(CompanyRegisterRequest request) {
        if (companyRepository.findByCompanyCode(request.getCompanyCode()).isPresent()) {
            throw new IllegalArgumentException("Company code is already taken.");
        }
        if (userRepository.findByEmail(request.getAdminEmail()).isPresent()) {
            throw new IllegalArgumentException("Email is already registered.");
        }

        validatePasswordStrength(request.getAdminPassword());

        // Create and save company
        Company company = new Company();
        company.setCompanyName(request.getCompanyName());
        company.setCompanyCode(request.getCompanyCode().toUpperCase());
        company.setEmail(request.getEmail());
        company.setPhone(request.getPhone());
        company.setAddress(request.getAddress());
        company.setWebsite(request.getWebsite());
        company.setCustomFields(request.getCustomFields());
        company.setStatus(CompanyStatus.PENDING); // Set to pending for Super Admin approval workflow

        Company savedCompany = companyRepository.save(company);

        // Create and save company admin
        User admin = new User();
        admin.setCompany(savedCompany);
        admin.setName(request.getAdminName());
        admin.setEmail(request.getAdminEmail());
        admin.setPassword(passwordEncoder.encode(request.getAdminPassword()));
        admin.setPhone(request.getAdminPhone());
        admin.setRole(Role.COMPANY_ADMIN);
        admin.setStatus(UserStatus.ACTIVE);

        userRepository.save(admin);

        return savedCompany;
    }

    @Transactional
    public User registerUser(String name, String email, String password, String phone, String companyCode, String roleStr) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email is already registered.");
        }
        Company company = companyRepository.findByCompanyCode(companyCode.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Invalid Company Code. Please verify with your organization admin."));

        validatePasswordStrength(password);

        User user = new User();
        user.setCompany(company);
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setPhone(phone);

        if ("AGENT".equalsIgnoreCase(roleStr)) {
            user.setRole(Role.AGENT);
            user.setStatus(UserStatus.PENDING); // Agent signup requires Company Admin approval
        } else {
            user.setRole(Role.END_USER);
            user.setStatus(UserStatus.ACTIVE); // Customer signup is direct & immediate
        }

        return userRepository.save(user);
    }

    @Transactional
    public Map<String, Object> handleForgotPassword(String email, String newPassword) {
        // Direct password reset path is completely disabled for all roles (including END_USER).
        // All password resets must flow through the verified OTP workflow.
        return sendPasswordResetOtp(email);
    }

    
    @Transactional
    public Map<String, Object> sendPasswordResetOtp(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email address is required.");
        }
        String cleanEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            // SECURITY H-4: Return identical generic response to prevent email enumeration
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "A 6-digit verification code has been sent to " + maskEmail(cleanEmail) + ". Please check your inbox or spam folder.");
            response.put("expiresInMinutes", 5);
            return response;
        }
        User user = userOpt.get();

        // Generate cryptographically secure 6-digit numeric OTP
        int randomPin = 100000 + new java.security.SecureRandom().nextInt(900000);
        String otp = String.valueOf(randomPin);

        // Invalidate any previous unused OTPs for this email
        passwordResetOtpRepository.invalidateAllPendingByEmail(cleanEmail);

        // Save fresh OTP (expires in 5 minutes)
        PasswordResetOtp resetOtp = PasswordResetOtp.builder()
                .email(cleanEmail)
                .otp(otp)
                .expiryTime(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();
        passwordResetOtpRepository.save(resetOtp);

        log.info("🔐 Generated Password Reset OTP for {}: {} (Expires in 5 minutes)", cleanEmail, otp);

        // Dispatch branded HTML email via EmailService
        emailService.sendPasswordResetOtpEmail(cleanEmail, user.getName(), otp, 5);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "A 6-digit verification code has been sent to " + maskEmail(cleanEmail) + ". Please check your inbox or spam folder.");
        response.put("expiresInMinutes", 5);
        return response;
    }

    @Transactional
    public Map<String, Object> verifyPasswordResetOtpOnly(String email, String otp) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email address is required.");
        }
        if (otp == null || otp.trim().isEmpty()) {
            throw new IllegalArgumentException("Verification code (OTP) is required.");
        }

        String cleanEmail = email.trim().toLowerCase();
        String cleanOtp = otp.trim();

        userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account found with email address: " + cleanEmail));

        PasswordResetOtp resetOtp = passwordResetOtpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification code. Please request a new code."));

        if (resetOtp.isUsed()) {
            throw new IllegalArgumentException("This verification code has already been used. Please request a new code.");
        }

        if (resetOtp.getExpiryTime().isBefore(LocalDateTime.now())) {
            resetOtp.setUsed(true);
            passwordResetOtpRepository.save(resetOtp);
            throw new IllegalArgumentException("Verification code has expired. Please request a new code.");
        }

        // SECURITY H-4: Limit brute-force attempts on OTP
        if (resetOtp.getAttemptCount() >= 5) {
            resetOtp.setUsed(true);
            passwordResetOtpRepository.save(resetOtp);
            throw new IllegalArgumentException("Too many invalid attempts. This verification code has been invalidated. Please request a new code.");
        }

        if (!resetOtp.getOtp().equals(cleanOtp)) {
            resetOtp.setAttemptCount(resetOtp.getAttemptCount() + 1);
            if (resetOtp.getAttemptCount() >= 5) {
                resetOtp.setUsed(true);
            }
            passwordResetOtpRepository.save(resetOtp);
            int remaining = 5 - resetOtp.getAttemptCount();
            throw new IllegalArgumentException("Invalid verification code. " + (remaining > 0 ? remaining + " attempt(s) remaining." : "Code invalidated."));
        }

        // Generate a cryptographically secure reset token (valid for password submission)
        String resetToken = java.util.UUID.randomUUID().toString();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("verified", true);
        response.put("resetToken", resetToken);
        response.put("message", "OTP verified successfully. Please set your new password.");
        return response;
    }

    @Transactional
    public Map<String, Object> verifyPasswordResetOtpAndReset(String email, String otp, String newPassword) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email address is required.");
        }
        if (otp == null || otp.trim().isEmpty()) {
            throw new IllegalArgumentException("Verification code (OTP) is required.");
        }
        if (newPassword == null || newPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("New password is required.");
        }

        String cleanEmail = email.trim().toLowerCase();
        String cleanOtp = otp.trim();

        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account found with email address: " + cleanEmail));

        PasswordResetOtp resetOtp = passwordResetOtpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification code. Please request a new code."));

        if (resetOtp.isUsed()) {
            throw new IllegalArgumentException("This verification code has already been used. Please request a new code.");
        }

        if (resetOtp.getExpiryTime().isBefore(LocalDateTime.now())) {
            resetOtp.setUsed(true);
            passwordResetOtpRepository.save(resetOtp);
            throw new IllegalArgumentException("Verification code has expired. Please request a new code.");
        }

        // SECURITY H-4: Limit brute-force attempts on OTP
        if (resetOtp.getAttemptCount() >= 5) {
            resetOtp.setUsed(true);
            passwordResetOtpRepository.save(resetOtp);
            throw new IllegalArgumentException("Too many invalid attempts. This verification code has been invalidated. Please request a new code.");
        }

        if (!resetOtp.getOtp().equals(cleanOtp)) {
            resetOtp.setAttemptCount(resetOtp.getAttemptCount() + 1);
            if (resetOtp.getAttemptCount() >= 5) {
                resetOtp.setUsed(true);
            }
            passwordResetOtpRepository.save(resetOtp);
            int remaining = 5 - resetOtp.getAttemptCount();
            throw new IllegalArgumentException("Invalid verification code. " + (remaining > 0 ? remaining + " attempt(s) remaining." : "Code invalidated."));
        }

        // Validate password complexity
        validatePasswordStrength(newPassword);

        // Update password with BCrypt and clear any reset requirement
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetRequired(false);
        userRepository.save(user);

        // Mark OTP as consumed
        resetOtp.setUsed(true);
        passwordResetOtpRepository.save(resetOtp);

        // Clear brute force login lockout from persistent store
        loginAttemptService.resetAttempts(cleanEmail);

        log.info("✅ Password successfully reset via OTP verification for user: {}", cleanEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Your password has been successfully reset! You can now login.");
        return response;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int atIndex = email.indexOf("@");
        String name = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (name.length() <= 2) return name.charAt(0) + "***" + domain;
        return name.charAt(0) + "***" + name.charAt(name.length() - 1) + domain;
    }

    public List<Map<String, Object>> getActiveCompanies() {
        return companyRepository.findAll().stream()
                .filter(c -> c.getStatus() == CompanyStatus.ACTIVE)
                .map(c -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", c.getId());
                    map.put("name", c.getCompanyName());
                    map.put("code", c.getCompanyCode());
                    map.put("customFields", c.getCustomFields());
                    
                    String logoUrl = "";
                    String primaryColor = "#4f46e5";
                    if (c.getCustomFields() != null && c.getCustomFields().contains("logoUrl")) {
                        try {
                            com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(c.getCustomFields());
                            if (node.has("logoUrl")) logoUrl = node.get("logoUrl").asText("");
                            if (node.has("primaryColor")) primaryColor = node.get("primaryColor").asText("#4f46e5");
                        } catch (Exception ignored) {}
                    }
                    map.put("logoUrl", logoUrl);
                    map.put("primaryColor", primaryColor);
                    return map;
                }).toList();
    }

    public Map<String, Object> getCompanyBrand(String companyCode) {
        Company c = companyRepository.findByCompanyCode(companyCode.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Company not found"));
        
        Map<String, Object> map = new HashMap<>();
        map.put("id", c.getId());
        map.put("companyName", c.getCompanyName());
        map.put("companyCode", c.getCompanyCode());
        map.put("customFields", c.getCustomFields());
        
        String logoUrl = "";
        String primaryColor = "#4f46e5";
        if (c.getCustomFields() != null && c.getCustomFields().contains("logoUrl")) {
            try {
                com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(c.getCustomFields());
                if (node.has("logoUrl")) logoUrl = node.get("logoUrl").asText("");
                if (node.has("primaryColor")) primaryColor = node.get("primaryColor").asText("#4f46e5");
            } catch (Exception ignored) {}
        }
        map.put("logoUrl", logoUrl);
        map.put("primaryColor", primaryColor);
        return map;
    }

    public LoginResponse impersonateCompanyAdmin(Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + companyId));

        User adminUser = userRepository.findByCompanyIdAndRole(company.getId(), Role.COMPANY_ADMIN).stream()
                .findFirst()
                .orElseGet(() -> userRepository.findByCompanyId(company.getId()).stream().findFirst().orElse(null));

        if (adminUser == null) {
            adminUser = new User();
            adminUser.setName(company.getCompanyName() + " Admin");
            adminUser.setEmail("admin@" + (company.getCompanyCode() != null ? company.getCompanyCode().toLowerCase() : "tenant") + ".com");
            // Generate cryptographically secure random temporary password (no hardcoded credentials)
            String tempPassword = java.util.UUID.randomUUID().toString().replace("-", "") + "Aa1!";
            adminUser.setPassword(passwordEncoder.encode(tempPassword));
            adminUser.setPasswordResetRequired(true);
            adminUser.setRole(Role.COMPANY_ADMIN);
            adminUser.setStatus(UserStatus.ACTIVE);
            adminUser.setCompany(company);
            adminUser = userRepository.save(adminUser);
            log.info("Auto-provisioned company admin for tenant {} with random credentials and forced OTP reset required.", company.getCompanyCode());
        }

        String token = outpostAuthService.obtainTokenForUser(adminUser.getEmail());

        String logoUrl = "";
        String primaryColor = "#4f46e5";
        String customFieldsStr = company.getCustomFields();
        if (customFieldsStr != null && customFieldsStr.contains("logoUrl")) {
            try {
                com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(customFieldsStr);
                if (node.has("logoUrl")) logoUrl = node.get("logoUrl").asText("");
                if (node.has("primaryColor")) primaryColor = node.get("primaryColor").asText("#4f46e5");
            } catch (Exception ignored) {}
        }

        return new LoginResponse(
                token,
                adminUser.getId(),
                adminUser.getName(),
                adminUser.getEmail(),
                adminUser.getRole(),
                company.getId(),
                company.getCompanyName(),
                company.getCompanyCode(),
                logoUrl,
                primaryColor,
                customFieldsStr
        );
    }
}
