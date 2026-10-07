package com.ticketpro.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Primary
@Service("inMemoryRateLimiterService")
@Slf4j
public class InMemoryRateLimiterService implements RateLimitService {

    @Value("${rate-limit.public-ticket.requests:${ticketpro.rate-limit.public-ticket.requests:10}}")
    private int maxRequests = 10;

    @Value("${rate-limit.public-ticket.window-seconds:${ticketpro.rate-limit.public-ticket.window-seconds:60}}")
    private long windowSeconds = 60;

    // IP / key -> Queue of request epoch milliseconds
    private final Map<String, ConcurrentLinkedQueue<Long>> requestLogs = new ConcurrentHashMap<>();

    public InMemoryRateLimiterService() {
    }

    public InMemoryRateLimiterService(int maxRequests, long windowSeconds) {
        this.maxRequests = maxRequests;
        this.windowSeconds = windowSeconds;
    }

    @Override
    public boolean tryAcquire(String key) {
        if (key == null || key.isBlank()) {
            key = "unknown";
        }

        long now = System.currentTimeMillis();
        long windowStart = now - (windowSeconds * 1000L);

        ConcurrentLinkedQueue<Long> timestamps = requestLogs.computeIfAbsent(key, k -> new ConcurrentLinkedQueue<>());

        // Evict expired entries
        while (!timestamps.isEmpty() && timestamps.peek() < windowStart) {
            timestamps.poll();
        }

        synchronized (timestamps) {
            // Re-check after eviction
            while (!timestamps.isEmpty() && timestamps.peek() < windowStart) {
                timestamps.poll();
            }

            if (timestamps.size() >= maxRequests) {
                log.warn("Rate limit exceeded for key '{}' ({}/{} reqs in {}s)", key, timestamps.size(), maxRequests, windowSeconds);
                return false;
            }

            timestamps.add(now);
            return true;
        }
    }

    @Override
    public long getWindowSeconds() {
        return windowSeconds;
    }

    @Override
    public int getMaxRequests() {
        return maxRequests;
    }

    public void setMaxRequests(int maxRequests) {
        this.maxRequests = maxRequests;
    }

    public void setWindowSeconds(long windowSeconds) {
        this.windowSeconds = windowSeconds;
    }

    @Override
    public void reset() {
        requestLogs.clear();
    }
}
