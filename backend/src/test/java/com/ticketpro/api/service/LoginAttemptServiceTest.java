package com.ticketpro.api.service;

import com.ticketpro.api.entity.LoginAttempt;
import com.ticketpro.api.exception.AccountLockedException;
import com.ticketpro.api.repository.LoginAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoginAttemptServiceTest {

    @Mock
    private LoginAttemptRepository loginAttemptRepository;

    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void setUp() {
        loginAttemptService = new LoginAttemptService(loginAttemptRepository);
    }

    @Test
    void checkLockout_WhenNotLocked_DoesNothing() {
        when(loginAttemptRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> loginAttemptService.checkLockout("test@example.com"));
    }

    @Test
    void checkLockout_WhenLocked_ThrowsAccountLockedException() {
        LoginAttempt attempt = LoginAttempt.builder()
                .email("test@example.com")
                .failedAttempts(5)
                .lockedUntil(LocalDateTime.now().plusMinutes(10))
                .build();

        when(loginAttemptRepository.findByEmail("test@example.com")).thenReturn(Optional.of(attempt));

        AccountLockedException ex = assertThrows(AccountLockedException.class, () ->
                loginAttemptService.checkLockout("test@example.com")
        );

        assertTrue(ex.getMessage().contains("Account is temporarily locked"));
        assertTrue(ex.getMinutesRemaining() > 0);
    }

    @Test
    void checkLockout_WhenLockoutExpired_ResetsCounter() {
        LoginAttempt attempt = LoginAttempt.builder()
                .email("test@example.com")
                .failedAttempts(5)
                .lockedUntil(LocalDateTime.now().minusMinutes(1))
                .build();

        when(loginAttemptRepository.findByEmail("test@example.com")).thenReturn(Optional.of(attempt));

        assertDoesNotThrow(() -> loginAttemptService.checkLockout("test@example.com"));
        assertEquals(0, attempt.getFailedAttempts());
        assertNull(attempt.getLockedUntil());
        verify(loginAttemptRepository).save(attempt);
    }

    @Test
    void recordFailedAttempt_UnderThreshold_IncrementsWithoutLockout() {
        LoginAttempt attempt = LoginAttempt.builder()
                .email("test@example.com")
                .failedAttempts(3)
                .build();

        when(loginAttemptRepository.findByEmail("test@example.com")).thenReturn(Optional.of(attempt));

        loginAttemptService.recordFailedAttempt("test@example.com");

        assertEquals(4, attempt.getFailedAttempts());
        assertNull(attempt.getLockedUntil());
        verify(loginAttemptRepository).save(attempt);
    }

    @Test
    void recordFailedAttempt_ReachesThreshold_LocksAccount() {
        LoginAttempt attempt = LoginAttempt.builder()
                .email("test@example.com")
                .failedAttempts(4)
                .build();

        when(loginAttemptRepository.findByEmail("test@example.com")).thenReturn(Optional.of(attempt));

        AccountLockedException ex = assertThrows(AccountLockedException.class, () ->
                loginAttemptService.recordFailedAttempt("test@example.com")
        );

        assertEquals(5, attempt.getFailedAttempts());
        assertNotNull(attempt.getLockedUntil());
        assertTrue(attempt.getLockedUntil().isAfter(LocalDateTime.now()));
        assertTrue(ex.getMessage().contains("Too many failed login attempts"));
        verify(loginAttemptRepository).save(attempt);
    }

    @Test
    void resetAttempts_ClearsFailedAttempts() {
        LoginAttempt attempt = LoginAttempt.builder()
                .email("test@example.com")
                .failedAttempts(3)
                .lockedUntil(LocalDateTime.now().plusMinutes(5))
                .build();

        when(loginAttemptRepository.findByEmail("test@example.com")).thenReturn(Optional.of(attempt));

        loginAttemptService.resetAttempts("test@example.com");

        assertEquals(0, attempt.getFailedAttempts());
        assertNull(attempt.getLockedUntil());
        verify(loginAttemptRepository).save(attempt);
    }
}
