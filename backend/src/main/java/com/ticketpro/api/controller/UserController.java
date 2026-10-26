package com.ticketpro.api.controller;

import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.dto.UserRequest;
import com.ticketpro.api.dto.UserResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.UserService;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Enterprise-grade REST Controller for managing user accounts and agent staff.
 * Purely delegates business and tenant resolution logic to {@link UserService}.
 */
@RestController
@RequestMapping(path = {"/api/v1/users", "/api/users"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Users", description = "Endpoints for managing user accounts, agent rosters, and tenant memberships")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Retrieve paginated list of users",
               description = "Returns a paginated list of users scoped to the caller's company tenant (or all users for Super Admins).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Users retrieved successfully",
                    content = @Content(schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - authentication required")
    })
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PagedResponse<UserResponse>> getUsers(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<UserResponse> userPage = userService.getUsersPaged(userDetails, pageable);
        return ResponseEntity.ok(PagedResponse.from(userPage));
    }

    @Operation(summary = "Retrieve list of support agents", 
               description = "Returns all available support agents scoped to the caller's organization.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Agents retrieved successfully",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = UserResponse.class)))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - authentication required")
    })
    @GetMapping("/agents")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UserResponse>> getAgents(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<UserResponse> agents = userService.getAgents(userDetails);
        return ResponseEntity.ok(agents);
    }

    @Operation(summary = "Create a new user", 
               description = "Creates a new user account under the authenticated company context or platform staff.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "User created successfully",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid user request payload"),
            @ApiResponse(responseCode = "403", description = "Forbidden - requires admin privileges")
    })
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody UserRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UserResponse createdUser = userService.createUser(request, userDetails);
        URI location;
        try {
            location = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/v1/users/{id}")
                    .buildAndExpand(createdUser.getId())
                    .toUri();
        } catch (Exception e) {
            location = URI.create("/api/v1/users/" + createdUser.getId());
        }
        return ResponseEntity.created(location).body(createdUser);
    }

    @Operation(summary = "Create a new tenant user (Super Admin only)", 
               description = "Creates a user account assigned explicitly to the specified tenant company.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Tenant user created successfully",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid payload or tenant ID"),
            @ApiResponse(responseCode = "403", description = "Forbidden - requires SUPER_ADMIN role"),
            @ApiResponse(responseCode = "404", description = "Target company not found")
    })
    @PostMapping("/tenant/{companyId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> createTenantUser(
            @Parameter(description = "ID of the target company tenant", required = true)
            @PathVariable("companyId") @Positive(message = "Company ID must be positive") Long companyId,
            @Valid @RequestBody UserRequest request
    ) {
        UserResponse createdUser = userService.createTenantUser(companyId, request);
        URI location;
        try {
            location = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/v1/users/{id}")
                    .buildAndExpand(createdUser.getId())
                    .toUri();
        } catch (Exception e) {
            location = URI.create("/api/v1/users/" + createdUser.getId());
        }
        return ResponseEntity.created(location).body(createdUser);
    }

    @Operation(summary = "Update an existing user", 
               description = "Updates profile attributes, role, or credentials for an existing user account.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User updated successfully",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid update payload or validation error"),
            @ApiResponse(responseCode = "403", description = "Forbidden - insufficient permissions"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<UserResponse> updateUser(
            @Parameter(description = "ID of the user to update", required = true)
            @PathVariable("id") @Positive(message = "User ID must be positive") Long id,
            @Valid @RequestBody UserRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UserResponse updated = userService.updateUser(id, request, userDetails);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "Delete a user account", 
               description = "Permanently deletes a user account within the company boundary.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "User deleted successfully"),
            @ApiResponse(responseCode = "400", description = "Cannot delete currently logged-in account"),
            @ApiResponse(responseCode = "403", description = "Forbidden - unauthorized"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<Void> deleteUser(
            @Parameter(description = "ID of the user to delete", required = true)
            @PathVariable("id") @Positive(message = "User ID must be positive") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        userService.deleteUser(id, userDetails);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Restore a deactivated user", 
               description = "Restores an inactive or suspended user account back to ACTIVE status.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User restored successfully",
                    content = @Content(schema = @Schema(implementation = UserResponse.class))),
            @ApiResponse(responseCode = "403", description = "Forbidden - unauthorized"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<UserResponse> restoreUser(
            @Parameter(description = "ID of the user to restore", required = true)
            @PathVariable("id") @Positive(message = "User ID must be positive") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        UserResponse restored = userService.restoreUser(id, userDetails);
        return ResponseEntity.ok(restored);
    }

    // Legacy test-compatibility overload
    public ResponseEntity<PagedResponse<UserResponse>> getUsers(
            Integer page,
            Integer size,
            CustomUserDetails userDetails,
            Pageable pageable
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        int pageNum = page != null ? page : 0;
        int pageSize = Math.min(size != null ? size : 20, 100);
        org.springframework.data.domain.PageRequest paged = org.springframework.data.domain.PageRequest.of(
                pageNum, pageSize, pageable != null ? pageable.getSort() : Sort.unsorted()
        );
        org.springframework.data.domain.Page<com.ticketpro.api.entity.User> userPage;
        if (userDetails.getRole() == com.ticketpro.api.entity.Role.SUPER_ADMIN) {
            userPage = userService.getAllUsersPaged(paged);
        } else {
            userPage = userService.getUsersByCompanyPaged(userDetails.getCompanyId(), paged);
        }
        if (userPage != null) {
            return ResponseEntity.ok(PagedResponse.from(userPage, UserResponse::from));
        }
        return getUsers(userDetails, paged);
    }
}
