package com.ticketpro.api.service;

import com.ticketpro.api.entity.LoginAttempt;
import com.ticketpro.api.exception.AccountLockedException;
import com.ticketpro.api.repository.LoginAttemptRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Service
public class LoginAttemptService {

    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final int LOCKOUT_DURATION_MINUTES = 15;

    private final LoginAttemptRepository loginAttemptRepository;

    public LoginAttemptService(LoginAttemptRepository loginAttemptRepository) {
        this.loginAttemptRepository = loginAttemptRepository;
    }

    /**
     * Checks if the given email account is currently locked out.
     * If the lockout duration has expired, clears the lockout state.
     * If still locked, throws AccountLockedException with remaining cooldown minutes.
     */
    @Transactional
    public void checkLockout(String email) {
        if (email == null || email.isBlank()) return;
        String cleanEmail = email.trim().toLowerCase();

        Optional<LoginAttempt> attemptOpt = loginAttemptRepository.findByEmail(cleanEmail);
        if (attemptOpt.isEmpty()) return;

        LoginAttempt attempt = attemptOpt.get();
        if (attempt.getLockedUntil() != null) {
            LocalDateTime now = LocalDateTime.now();
            if (attempt.getLockedUntil().isAfter(now)) {
                long minutesRemaining = Math.max(1, Duration.between(now, attempt.getLockedUntil()).toMinutes() + 1);
                log.warn("Login blocked for locked account: {} ({} minutes remaining)", cleanEmail, minutesRemaining);
                throw new AccountLockedException(
                        "Account is temporarily locked due to 5 consecutive failed login attempts. " +
                        "Please try again in " + minutesRemaining + " minutes or reset your password via OTP.",
                        attempt.getLockedUntil(),
                        minutesRemaining
                );
            } else {
                // Lockout cooldown has expired — reset state
                attempt.setFailedAttempts(0);
                attempt.setLockedUntil(null);
                loginAttemptRepository.save(attempt);
                log.info("Lockout period expired for account: {}. Counter reset.", cleanEmail);
            }
        }
    }

    /**
     * Records a failed login attempt for the given email in a standalone transaction.
     * When reaching MAX_FAILED_ATTEMPTS, locks the account for 15 minutes and throws AccountLockedException.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = AccountLockedException.class)
    public void recordFailedAttempt(String email) {
        if (email == null || email.isBlank()) return;
        String cleanEmail = email.trim().toLowerCase();

        LoginAttempt attempt = loginAttemptRepository.findByEmail(cleanEmail)
                .orElseGet(() -> new LoginAttempt(cleanEmail));

        // If previous lockout expired, reset counter before incrementing
        if (attempt.getLockedUntil() != null && !attempt.getLockedUntil().isAfter(LocalDateTime.now())) {
            attempt.setFailedAttempts(0);
            attempt.setLockedUntil(null);
        }

        int newFailedCount = attempt.getFailedAttempts() + 1;
        attempt.setFailedAttempts(newFailedCount);
        attempt.setLastAttemptTime(LocalDateTime.now());

        if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
            LocalDateTime lockUntil = LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES);
            attempt.setLockedUntil(lockUntil);
            loginAttemptRepository.save(attempt);
            log.warn("Account {} locked for {} minutes due to {} failed login attempts.",
                    cleanEmail, LOCKOUT_DURATION_MINUTES, newFailedCount);
            throw new AccountLockedException(
                    "Too many failed login attempts. Account is locked for " + LOCKOUT_DURATION_MINUTES +
                    " minutes. Please try again later or reset your password via OTP.",
                    lockUntil,
                    LOCKOUT_DURATION_MINUTES
            );
        } else {
            loginAttemptRepository.save(attempt);
            int remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
            log.warn("Failed login attempt for {}. {} attempt(s) remaining before lockout.", cleanEmail, remaining);
        }
    }

    /**
     * Resets failed login attempts and unlocks the account.
     * Called upon successful login or successful password reset via OTP.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void resetAttempts(String email) {
        if (email == null || email.isBlank()) return;
        String cleanEmail = email.trim().toLowerCase();
        try {
            loginAttemptRepository.findByEmail(cleanEmail).ifPresent(attempt -> {
                attempt.setFailedAttempts(0);
                attempt.setLockedUntil(null);
                loginAttemptRepository.save(attempt);
                log.info("Reset login attempt counter for: {}", cleanEmail);
            });
        } catch (Exception e) {
            log.warn("Could not reset login attempt counter for {}: {}", cleanEmail, e.getMessage());
        }
    }
}
