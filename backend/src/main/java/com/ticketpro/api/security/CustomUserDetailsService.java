package com.ticketpro.api.security;

import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final Map<String, CachedUserDetails> userCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 120_000L; // 2 minutes

    private static class CachedUserDetails {
        final CustomUserDetails userDetails;
        final long expiresAt;

        CachedUserDetails(CustomUserDetails userDetails, long ttlMs) {
            this.userDetails = userDetails;
            this.expiresAt = System.currentTimeMillis() + ttlMs;
        }

        boolean isValid() {
            return System.currentTimeMillis() < expiresAt;
        }
    }

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (email == null || email.isBlank()) {
            throw new UsernameNotFoundException("Email cannot be blank");
        }
        String cleanEmail = email.trim().toLowerCase();
        CachedUserDetails cached = userCache.get(cleanEmail);
        if (cached != null && cached.isValid()) {
            return cached.userDetails;
        }

        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + cleanEmail));
        CustomUserDetails details = new CustomUserDetails(user);
        userCache.put(cleanEmail, new CachedUserDetails(details, CACHE_TTL_MS));
        return details;
    }

    public void evictUser(String email) {
        if (email != null) {
            userCache.remove(email.trim().toLowerCase());
        }
    }

    public void clearCache() {
        userCache.clear();
    }
}
