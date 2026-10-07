package com.ticketpro.api.service;

import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.entity.UserStatus;
import com.ticketpro.api.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttemptService;

    @Value("${ticketpro.superadmin.email:}")
    private String superAdminEmail;

    @Value("${ticketpro.superadmin.password:}")
    private String superAdminPassword;

    public DataInitializer(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           LoginAttemptService loginAttemptService) {
         this.userRepository = userRepository;
         this.passwordEncoder = passwordEncoder;
         this.loginAttemptService = loginAttemptService;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // Only initialize Super Admin credentials if configured via environment variables
        if (superAdminEmail == null || superAdminEmail.isBlank() ||
            superAdminPassword == null || superAdminPassword.isBlank()) {
            log.info("Super Admin environment variables (TICKETPRO_SUPERADMIN_EMAIL / TICKETPRO_SUPERADMIN_PASSWORD) not set. Skipping automatic Super Admin creation.");
            return;
        }

        String targetEmail = superAdminEmail.trim().toLowerCase();

        User superAdmin = userRepository.findByEmail(targetEmail)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> u.getRole() == Role.SUPER_ADMIN)
                        .findFirst()
                        .orElse(null));

        if (superAdmin == null) {
            superAdmin = new User();
            superAdmin.setName("Super Admin");
            superAdmin.setEmail(targetEmail);
            superAdmin.setPassword(passwordEncoder.encode(superAdminPassword));
            superAdmin.setRole(Role.SUPER_ADMIN);
            superAdmin.setCompany(null);
            superAdmin.setStatus(UserStatus.ACTIVE);
            superAdmin.setPhone("+91 9999988888");
            superAdmin.setPasswordResetRequired(false);
            userRepository.save(superAdmin);
            log.info("Super Admin account initialized: {}", targetEmail);
        } else {
            superAdmin.setEmail(targetEmail);
            superAdmin.setPassword(passwordEncoder.encode(superAdminPassword));
            superAdmin.setRole(Role.SUPER_ADMIN);
            superAdmin.setStatus(UserStatus.ACTIVE);
            superAdmin.setPasswordResetRequired(false);
            userRepository.save(superAdmin);
            log.info("Super Admin account credentials synchronized: {}", targetEmail);
        }

        loginAttemptService.resetAttempts(targetEmail);
        loginAttemptService.resetAttempts(superAdminEmail);
    }
}
