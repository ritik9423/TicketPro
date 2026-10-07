package com.ticketpro.api.controller;

import com.ticketpro.api.dto.UserRequest;
import com.ticketpro.api.dto.UserResponse;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.CompanyService;
import com.ticketpro.api.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * User Controller — returns sanitized UserResponse DTOs.
 * No password hashes, internal timestamps, or Hibernate proxies leak to clients.
 * All exceptions delegate to GlobalExceptionHandler.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final CompanyService companyService;

    public UserController(UserService userService, CompanyService companyService) {
        this.userService = userService;
        this.companyService = companyService;
    }

    @GetMapping
    public ResponseEntity<?> getUsers(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            org.springframework.data.domain.Pageable pageable) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        int pageNum = page != null ? page : 0;
        int pageSize = Math.min(size != null ? size : 20, 100);
        org.springframework.data.domain.PageRequest paged = org.springframework.data.domain.PageRequest.of(pageNum, pageSize, pageable.getSort());
        org.springframework.data.domain.Page<User> userPage;
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            userPage = userService.getAllUsersPaged(paged);
        } else {
            userPage = userService.getUsersByCompanyPaged(userDetails.getCompanyId(), paged);
        }
        return ResponseEntity.ok(com.ticketpro.api.dto.PagedResponse.from(userPage, UserResponse::from));
    }

    @GetMapping("/agents")
    public ResponseEntity<List<UserResponse>> getAgents(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<User> agents;
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            agents = userService.getAllUsers().stream().filter(u -> u.getRole() == Role.AGENT).toList();
        } else {
            agents = userService.getAgentsByCompany(userDetails.getCompanyId());
        }
        return ResponseEntity.ok(agents.stream().map(UserResponse::from).toList());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Company company;
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            if (request.getCompanyId() != null && request.getCompanyId() > 0) {
                company = companyService.getCompanyById(request.getCompanyId());
            } else {
                company = null; // Platform Staff / Super Admin
            }
        } else {
            company = userDetails.getUser().getCompany();
        }

        User createdUser = userService.createUser(request, company);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(createdUser));
    }

    @PostMapping("/tenant/{companyId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> createTenantUser(@PathVariable("companyId") Long companyId, @Valid @RequestBody UserRequest request) {
        Company company = companyService.getCompanyById(companyId);
        User createdUser = userService.createUser(request, company);
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(createdUser));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable("id") Long id, @Valid @RequestBody UserRequest request, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User updated = userService.updateUser(id, request, userDetails.getCompanyId(), userDetails.getRole(), userDetails.getId());
        return ResponseEntity.ok(UserResponse.from(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable("id") Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (userDetails.getId() != null && userDetails.getId().equals(id)) {
            throw new IllegalArgumentException("You cannot delete your own logged-in account.");
        }
        userService.deleteUser(id, userDetails.getCompanyId(), userDetails.getRole());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<UserResponse> restoreUser(@PathVariable("id") Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User restored = userService.restoreUser(id, userDetails.getCompanyId(), userDetails.getRole());
        return ResponseEntity.ok(UserResponse.from(restored));
    }
}
