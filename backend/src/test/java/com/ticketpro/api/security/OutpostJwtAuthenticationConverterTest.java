package com.ticketpro.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class OutpostJwtAuthenticationConverterTest {

    private UserDetailsService userDetailsService;
    private OutpostJwtAuthenticationConverter converter;

    @BeforeEach
    void setUp() {
        userDetailsService = mock(UserDetailsService.class);
        converter = new OutpostJwtAuthenticationConverter(userDetailsService);
    }

    @Test
    void convert_extractsRolesAndScopesCorrectly() {
        Jwt jwt = new Jwt(
                "mock-token-value",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of(
                        "sub", "outpost-service-account",
                        "roles", List.of("ADMIN", "SUPPORT"),
                        "scope", "read write"
                )
        );

        when(userDetailsService.loadUserByUsername(anyString())).thenThrow(new UsernameNotFoundException("Not found"));

        AbstractAuthenticationToken authToken = converter.convert(jwt);

        assertNotNull(authToken);
        assertTrue(authToken.isAuthenticated());
        assertTrue(authToken.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
        assertTrue(authToken.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUPPORT")));
        assertTrue(authToken.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("SCOPE_read")));
        assertTrue(authToken.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("SCOPE_write")));
    }
}
