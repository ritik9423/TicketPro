package com.ticketpro.api.controller;

import com.ticketpro.api.dto.*;
import com.ticketpro.api.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Enterprise-grade REST Controller for authentication, registration, and credential security flows.
 */
@RestController
@RequestMapping(path = {"/api/v1/auth", "/api/auth"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Authentication", description = "Endpoints for user login, organization signup, password OTP recovery, and workspace impersonation")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Authenticate user credentials", 
               description = "Validates username/email and password, enforces brute force lockout, and issues a signed JWT token.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Authentication successful",
                    content = @Content(schema = @Schema(implementation = LoginResponse.class))),
            @ApiResponse(responseCode = "400", description = "Bad credentials or locked account"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid credentials")
    })
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.authenticate(request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Register a new tenant company and admin account", 
               description = "Provisions a new organization workspace along with its primary administrator account.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Company and administrator created successfully",
                    content = @Content(schema = @Schema(implementation = CompanyRegisterResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation error or company code/email already in use")
    })
    @PostMapping("/register-company")
    public ResponseEntity<CompanyRegisterResponse> registerCompany(@Valid @RequestBody CompanyRegisterRequest request) {
        CompanyRegisterResponse response = authService.registerCompanyDto(request);
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/companies/{id}")
                .buildAndExpand(response.getCompanyId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Operation(summary = "Register a new user or agent", 
               description = "Registers an individual user or support agent against a tenant organization workspace.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "User registered successfully",
                    content = @Content(schema = @Schema(implementation = UserRegisterResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation error or email already registered")
    })
    @PostMapping("/register-user")
    public ResponseEntity<UserRegisterResponse> registerUser(@Valid @RequestBody UserRegisterRequest request) {
        UserRegisterResponse response = authService.registerUserDto(request);
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/users/{id}")
                .buildAndExpand(response.getUserId())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Operation(summary = "Send password reset OTP", 
               description = "Dispatches a secure 6-digit numeric OTP to the verified user email address.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OTP dispatched (or generic response returned for enumeration protection)",
                    content = @Content(schema = @Schema(implementation = OtpResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid email format")
    })
    @PostMapping("/send-reset-otp")
    public ResponseEntity<OtpResponse> sendResetOtp(@Valid @RequestBody SendOtpRequest request) {
        OtpResponse response = authService.sendPasswordResetOtpDto(request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Verify OTP code", 
               description = "Verifies the 6-digit OTP code against brute force limits and generates a short-lived reset token.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OTP code is valid",
                    content = @Content(schema = @Schema(implementation = VerifyOtpResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid or expired OTP code")
    })
    @PostMapping("/verify-otp")
    public ResponseEntity<VerifyOtpResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        VerifyOtpResponse response = authService.verifyPasswordResetOtpOnlyDto(request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Verify OTP and set new password", 
               description = "Validates OTP code, applies password strength rules, and resets the account password.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Password successfully reset",
                    content = @Content(schema = @Schema(implementation = OtpResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid OTP or weak password")
    })
    @PostMapping("/verify-reset-otp")
    public ResponseEntity<OtpResponse> verifyResetOtp(@Valid @RequestBody ResetPasswordRequest request) {
        OtpResponse response = authService.verifyPasswordResetOtpAndResetDto(request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Forgot password request (delegates to OTP workflow)", 
               description = "Backward-compatible alias for the secure OTP dispatch flow.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "OTP dispatched",
                    content = @Content(schema = @Schema(implementation = OtpResponse.class)))
    })
    @PostMapping("/forgot-password")
    public ResponseEntity<OtpResponse> forgotPassword(@Valid @RequestBody SendOtpRequest request) {
        OtpResponse response = authService.sendPasswordResetOtpDto(request);
        return ResponseEntity.ok(response);
    }

    // Legacy test-compatibility overloads
    public ResponseEntity<java.util.Map<String, Object>> forgotPassword(java.util.Map<String, ?> request) {
        String email = request != null && request.get("email") != null ? String.valueOf(request.get("email")) : null;
        java.util.Map<String, Object> result = authService.sendPasswordResetOtp(email);
        return ResponseEntity.ok(result);
    }

    public ResponseEntity<OtpResponse> sendResetOtp(java.util.Map<String, String> request) {
        String email = request != null ? request.get("email") : null;
        return sendResetOtp(new SendOtpRequest(email));
    }

    public ResponseEntity<VerifyOtpResponse> verifyOtp(java.util.Map<String, String> request) {
        String email = request != null ? request.get("email") : null;
        String otp = request != null ? request.get("otp") : null;
        return verifyOtp(new VerifyOtpRequest(email, otp));
    }

    public ResponseEntity<OtpResponse> verifyResetOtp(java.util.Map<String, String> request) {
        String email = request != null ? request.get("email") : null;
        String otp = request != null ? request.get("otp") : null;
        String newPassword = request != null ? request.get("newPassword") : null;
        return verifyResetOtp(new ResetPasswordRequest(email, otp, newPassword));
    }

    @Operation(summary = "List active tenant organizations", 
               description = "Returns public branding and identifier information for active tenant companies.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Active companies retrieved",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = ActiveCompanyResponse.class))))
    })
    @GetMapping("/companies")
    public ResponseEntity<List<ActiveCompanyResponse>> getActiveCompanies() {
        List<ActiveCompanyResponse> companies = authService.getActiveCompaniesDto();
        return ResponseEntity.ok(companies);
    }

    @Operation(summary = "Impersonate tenant company admin (Super Admin only)", 
               description = "Issues an administrative JWT token simulating login as the target workspace's administrator.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Impersonation session established",
                    content = @Content(schema = @Schema(implementation = LoginResponse.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden - requires SUPER_ADMIN"),
            @ApiResponse(responseCode = "404", description = "Target company not found")
    })
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/impersonate/{companyId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<LoginResponse> impersonateCompany(
            @Parameter(description = "ID of the target tenant company to impersonate", required = true)
            @PathVariable("companyId") @Positive(message = "Company ID must be positive") Long companyId
    ) {
        LoginResponse response = authService.impersonateCompanyAdmin(companyId);
        return ResponseEntity.ok(response);
    }
}
