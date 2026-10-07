package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CompanyRegisterRequest;
import com.ticketpro.api.dto.LoginRequest;
import com.ticketpro.api.dto.LoginResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.authenticate(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register-company")
    public ResponseEntity<Map<String, Object>> registerCompany(@Valid @RequestBody CompanyRegisterRequest request) {
        Company company = authService.registerCompany(request);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Company and admin user registered successfully");
        response.put("companyId", company.getId());
        response.put("companyCode", company.getCompanyCode());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/register-user")
    public ResponseEntity<Map<String, Object>> registerUser(@RequestBody Map<String, String> request) {
        User user = authService.registerUser(
            request.get("name"),
            request.get("email"),
            request.get("password"),
            request.get("phone"),
            request.get("companyCode"),
            request.get("role")
        );
        Map<String, Object> response = new HashMap<>();
        if (user.getRole() == com.ticketpro.api.entity.Role.AGENT) {
            response.put("message", "Agent registration submitted! Approval pending from Company Admin.");
            response.put("status", "PENDING");
        } else {
            response.put("message", "User registered successfully! You can login immediately.");
            response.put("status", "ACTIVE");
        }
        response.put("userId", user.getId());
        response.put("name", user.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/send-reset-otp")
    public ResponseEntity<Map<String, Object>> sendResetOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Map<String, Object> response = authService.sendPasswordResetOtp(email);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        Map<String, Object> response = authService.verifyPasswordResetOtpOnly(email, otp);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<Map<String, Object>> verifyResetOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");
        Map<String, Object> response = authService.verifyPasswordResetOtpAndReset(email, otp, newPassword);
        return ResponseEntity.ok(response);
    }

    /**
     * Backward-compatible forgot-password endpoint: strictly delegates to the secure OTP flow.
     * Direct password resets without OTP verification are completely eliminated.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Map<String, Object> response = authService.sendPasswordResetOtp(email);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/companies")
    public ResponseEntity<?> getActiveCompanies() {
        return ResponseEntity.ok(authService.getActiveCompanies());
    }

    @PostMapping("/impersonate/{companyId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<LoginResponse> impersonateCompany(@PathVariable("companyId") Long companyId) {
        LoginResponse response = authService.impersonateCompanyAdmin(companyId);
        return ResponseEntity.ok(response);
    }
}
