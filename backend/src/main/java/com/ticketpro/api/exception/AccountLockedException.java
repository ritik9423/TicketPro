package com.ticketpro.api.exception;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class AccountLockedException extends RuntimeException {

    private final LocalDateTime lockedUntil;
    private final long minutesRemaining;

    public AccountLockedException(String message) {
        super(message);
        this.lockedUntil = null;
        this.minutesRemaining = 15;
    }

    public AccountLockedException(String message, LocalDateTime lockedUntil, long minutesRemaining) {
        super(message);
        this.lockedUntil = lockedUntil;
        this.minutesRemaining = minutesRemaining;
    }
}
