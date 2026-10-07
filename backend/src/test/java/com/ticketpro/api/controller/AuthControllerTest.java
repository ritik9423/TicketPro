package com.ticketpro.api.controller;

import com.ticketpro.api.dto.LoginRequest;
import com.ticketpro.api.dto.LoginResponse;
import com.ticketpro.api.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    @Test
    void impersonateCompanyRequiresSuperAdminRole() throws NoSuchMethodException {
        AuthController controller = new AuthController(mock(AuthService.class));

        PreAuthorize annotation = controller.getClass()
                .getMethod("impersonateCompany", Long.class)
                .getAnnotation(PreAuthorize.class);

        assertNotNull(annotation);
        assertEquals("hasRole('SUPER_ADMIN')", annotation.value());
    }

    @Test
    void forgotPassword_DelegatesToOtpFlow() {
        AuthService authService = mock(AuthService.class);
        AuthController controller = new AuthController(authService);

        when(authService.sendPasswordResetOtp("user@test.com")).thenReturn(Map.of("success", true, "message", "OTP sent"));

        ResponseEntity<Map<String, Object>> response = controller.forgotPassword(Map.of("email", "user@test.com", "newPassword", "AttemptHacked"));

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        Map<String, Object> body = java.util.Objects.requireNonNull(response.getBody());
        assertEquals(true, body.get("success"));
        verify(authService).sendPasswordResetOtp("user@test.com");
    }

    @Test
    void login_ReturnsResponseFromAuthService() {
        AuthService authService = mock(AuthService.class);
        AuthController controller = new AuthController(authService);

        LoginRequest request = new LoginRequest();
        request.setEmail("user@test.com");
        request.setPassword("password123");

        LoginResponse mockResponse = new LoginResponse();
        mockResponse.setToken("sample_token");
        when(authService.authenticate(request)).thenReturn(mockResponse);

        ResponseEntity<LoginResponse> response = controller.login(request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        LoginResponse body = java.util.Objects.requireNonNull(response.getBody());
        assertEquals("sample_token", body.getToken());
        verify(authService).authenticate(request);
    }
}
