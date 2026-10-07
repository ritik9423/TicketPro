package com.ticketpro.api.service;

import com.ticketpro.api.dto.LoginRequest;
import com.ticketpro.api.dto.LoginResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.CompanyStatus;
import com.ticketpro.api.entity.PasswordResetOtp;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.exception.AccountLockedException;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.PasswordResetOtpRepository;
import com.ticketpro.api.repository.UserRepository;
import com.ticketpro.api.service.outpost.OutpostAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceOtpTest {

    @Mock private AuthenticationManager authenticationManager;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private OutpostAuthService outpostAuthService;
    @Mock private PasswordResetOtpRepository passwordResetOtpRepository;
    @Mock private EmailService emailService;
    @Mock private LoginAttemptService loginAttemptService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                authenticationManager,
                companyRepository,
                userRepository,
                passwordEncoder,
                outpostAuthService,
                passwordResetOtpRepository,
                emailService,
                loginAttemptService
        );
    }

    @Test
    void sendPasswordResetOtp_Success() {
        User user = new User();
        user.setEmail("user@example.com");
        user.setName("John Doe");
        user.setRole(Role.END_USER);

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        Map<String, Object> result = authService.sendPasswordResetOtp("user@example.com");

        assertTrue((Boolean) result.get("success"));
        verify(passwordResetOtpRepository).invalidateAllPendingByEmail("user@example.com");

        ArgumentCaptor<PasswordResetOtp> otpCaptor = ArgumentCaptor.forClass(PasswordResetOtp.class);
        verify(passwordResetOtpRepository).save(otpCaptor.capture());
        PasswordResetOtp savedOtp = otpCaptor.getValue();

        assertEquals("user@example.com", savedOtp.getEmail());
        assertNotNull(savedOtp.getOtp());
        assertEquals(6, savedOtp.getOtp().length());
        assertFalse(savedOtp.isUsed());

        verify(emailService).sendPasswordResetOtpEmail(eq("user@example.com"), eq("John Doe"), eq(savedOtp.getOtp()), eq(5));
    }

    @Test
    void handleForgotPassword_RoutesToOtpFlow_NoDirectReset() {
        User user = new User();
        user.setEmail("victim@example.com");
        user.setName("Victim User");
        user.setRole(Role.END_USER);

        when(userRepository.findByEmail("victim@example.com")).thenReturn(Optional.of(user));

        // Attempting direct reset with a new password must NOT reset password; it must route to OTP flow
        Map<String, Object> result = authService.handleForgotPassword("victim@example.com", "HackedPass123");

        assertTrue((Boolean) result.get("success"));
        verify(passwordResetOtpRepository).invalidateAllPendingByEmail("victim@example.com");
        verify(passwordResetOtpRepository).save(any(PasswordResetOtp.class));
        verify(emailService).sendPasswordResetOtpEmail(eq("victim@example.com"), eq("Victim User"), any(), eq(5));
        // Password must NEVER have been encoded or user saved directly
        verify(userRepository, never()).save(user);
    }

    @Test
    void verifyPasswordResetOtpAndReset_Success() {
        User user = new User();
        user.setEmail("user@example.com");
        user.setPassword("oldHash");

        PasswordResetOtp otpRecord = PasswordResetOtp.builder()
                .email("user@example.com")
                .otp("123456")
                .expiryTime(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("user@example.com"))
                .thenReturn(Optional.of(otpRecord));
        when(passwordEncoder.encode("StrongPassword123")).thenReturn("newHashedPassword");

        Map<String, Object> result = authService.verifyPasswordResetOtpAndReset("user@example.com", "123456", "StrongPassword123");

        assertTrue((Boolean) result.get("success"));
        assertTrue(otpRecord.isUsed());
        assertEquals("newHashedPassword", user.getPassword());
        assertFalse(user.getPasswordResetRequired());
        verify(userRepository).save(user);
        verify(passwordResetOtpRepository).save(otpRecord);
        verify(loginAttemptService).resetAttempts("user@example.com");
    }

    @Test
    void verifyPasswordResetOtpAndReset_ExpiredThrowsException() {
        User user = new User();
        user.setEmail("user@example.com");

        PasswordResetOtp expiredOtp = PasswordResetOtp.builder()
                .email("user@example.com")
                .otp("123456")
                .expiryTime(LocalDateTime.now().minusMinutes(1))
                .used(false)
                .createdAt(LocalDateTime.now().minusMinutes(6))
                .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("user@example.com"))
                .thenReturn(Optional.of(expiredOtp));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                authService.verifyPasswordResetOtpAndReset("user@example.com", "123456", "StrongPassword123")
        );

        assertTrue(ex.getMessage().contains("expired"));
    }

    @Test
    void verifyPasswordResetOtpAndReset_InvalidCodeThrowsException() {
        User user = new User();
        user.setEmail("user@example.com");

        PasswordResetOtp otpRecord = PasswordResetOtp.builder()
                .email("user@example.com")
                .otp("999999")
                .expiryTime(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordResetOtpRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("user@example.com"))
                .thenReturn(Optional.of(otpRecord));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                authService.verifyPasswordResetOtpAndReset("user@example.com", "111111", "StrongPassword123")
        );

        assertTrue(ex.getMessage().contains("Invalid verification code"));
    }

    @Test
    void authenticate_AccountLocked_ThrowsAccountLockedException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("locked@example.com");
        request.setPassword("Password123");

        doThrow(new AccountLockedException("Account is locked for 15 minutes", LocalDateTime.now().plusMinutes(15), 15))
                .when(loginAttemptService).checkLockout("locked@example.com");

        assertThrows(AccountLockedException.class, () -> authService.authenticate(request));
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void impersonateCompanyAdmin_GeneratesRandomPasswordAndRequiresReset() {
        Company company = new Company();
        company.setId(10L);
        company.setCompanyName("Acme Corp");
        company.setCompanyCode("ACME");
        company.setStatus(CompanyStatus.ACTIVE);

        when(companyRepository.findById(10L)).thenReturn(Optional.of(company));
        when(userRepository.findByCompanyIdAndRole(10L, Role.COMPANY_ADMIN)).thenReturn(Collections.emptyList());
        when(userRepository.findByCompanyId(10L)).thenReturn(Collections.emptyList());
        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "encoded_" + inv.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(99L);
            return u;
        });
        when(outpostAuthService.obtainTokenForUser(anyString())).thenReturn("mock_impersonation_token");

        LoginResponse response = authService.impersonateCompanyAdmin(10L);

        assertNotNull(response);
        assertEquals("mock_impersonation_token", response.getToken());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedAdmin = userCaptor.getValue();

        assertEquals("admin@acme.com", savedAdmin.getEmail());
        assertTrue(savedAdmin.getPasswordResetRequired());
        // Verify that the password is NOT the old hardcoded Admin@123
        ArgumentCaptor<String> rawPassCaptor = ArgumentCaptor.forClass(String.class);
        verify(passwordEncoder).encode(rawPassCaptor.capture());
        assertNotEquals("Admin@123", rawPassCaptor.getValue());
        assertTrue(rawPassCaptor.getValue().length() >= 16);
    }
}
