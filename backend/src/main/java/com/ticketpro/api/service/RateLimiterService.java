package com.ticketpro.api.service;

/**
 * Common Rate Limiter interface for throttling incoming requests.
 */
public interface RateLimiterService {
    boolean tryAcquire(String key);
    long getWindowSeconds();
    int getMaxRequests();
    void reset();
}
