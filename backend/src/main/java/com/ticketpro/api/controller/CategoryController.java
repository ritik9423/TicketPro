package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CategoryRequest;
import com.ticketpro.api.dto.CategoryResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Enterprise Multi-Tenant Category Controller.
 * Manages ticket routing taxonomies, department categories, and custom field templates.
 */
@RestController
@RequestMapping(path = {"/api/v1/categories", "/api/categories"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Categories", description = "Endpoints for support categorization, routing classifications, and tenant categories.")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("/company/{companyId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get categories by company ID",
            description = "Retrieves categories mapped to a specific tenant with cross-tenant authorization checks."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categories retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = CategoryResponse.class)))),
            @ApiResponse(responseCode = "400", description = "Invalid company ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content)
    })
    public ResponseEntity<List<CategoryResponse>> getCategoriesByCompanyId(
            @Parameter(description = "ID of the company", required = true, example = "1")
            @PathVariable("companyId")
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (userDetails != null && userDetails.getRole() != Role.SUPER_ADMIN) {
            if (!companyId.equals(userDetails.getCompanyId())) {
                throw new SecurityException("Cross-tenant category access is forbidden.");
            }
        }
        List<CategoryResponse> categories = categoryService.getCategoriesByCompany(companyId)
                .stream()
                .map(CategoryResponse::from)
                .toList();
        return ResponseEntity.ok(categories);
    }

    @GetMapping
    @Operation(
            summary = "Get categories for tenant",
            description = "Retrieves the active category taxonomy for caller's organization."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categories retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = CategoryResponse.class)))),
            @ApiResponse(responseCode = "400", description = "Invalid query arguments", content = @Content)
    })
    public ResponseEntity<List<CategoryResponse>> getCategories(
            @Parameter(description = "Optional company ID filter", example = "1")
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @Parameter(description = "Optional company code filter", example = "HDFCBANK")
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<CategoryResponse> categories = categoryService.getCategories(companyId, companyCode, userDetails);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/paged")
    @Operation(
            summary = "Get paginated categories",
            description = "Retrieves categories formatted in a standard server-side paginated envelope."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categories retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = PagedResponse.class)))
    })
    public ResponseEntity<PagedResponse<CategoryResponse>> getCategoriesPaged(
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PagedResponse<CategoryResponse> page = categoryService.getCategoriesPaged(companyId, companyCode, userDetails, pageable);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/active")
    @Operation(
            summary = "Get active categories",
            description = "Retrieves active categories available for ticket submission and routing."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Active categories retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = CategoryResponse.class))))
    })
    public ResponseEntity<List<CategoryResponse>> getActiveCategories(
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<CategoryResponse> categories = categoryService.getActiveCategories(companyId, companyCode, userDetails);
        return ResponseEntity.ok(categories);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Create category",
            description = "Creates a new ticket category associated with caller's organization."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Category created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = CategoryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed for category payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires ADMIN role", content = @Content)
    })
    public ResponseEntity<CategoryResponse> createCategory(
            @Valid @RequestBody CategoryRequest request,
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        CategoryResponse created = categoryService.createCategory(request, companyId, companyCode, userDetails);
        URI location;
        try {
            location = ServletUriComponentsBuilder.fromCurrentRequest()
                    .path("/{id}")
                    .buildAndExpand(created.getId())
                    .toUri();
        } catch (Exception e) {
            location = URI.create("/api/v1/categories/" + created.getId());
        }
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Update category",
            description = "Modifies category name, description, or status with tenant verification."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Category updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = CategoryResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or invalid ID", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant update denied", content = @Content),
            @ApiResponse(responseCode = "404", description = "Category not found", content = @Content)
    })
    public ResponseEntity<CategoryResponse> updateCategory(
            @Parameter(description = "ID of the category to update", required = true, example = "2")
            @PathVariable("id")
            @Positive(message = "Category ID must be a positive integer") Long id,
            @Valid @RequestBody CategoryRequest request,
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        CategoryResponse updated = categoryService.updateCategory(id, request, companyId, companyCode, userDetails);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Delete category",
            description = "Deletes or archives a category with tenant verification."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Category deleted successfully (no content)"),
            @ApiResponse(responseCode = "400", description = "Invalid ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant deletion denied", content = @Content),
            @ApiResponse(responseCode = "404", description = "Category not found", content = @Content)
    })
    public ResponseEntity<Void> deleteCategory(
            @Parameter(description = "ID of the category to delete", required = true, example = "2")
            @PathVariable("id")
            @Positive(message = "Category ID must be a positive integer") Long id,
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @RequestParam(name = "companyCode", required = false) String companyCode,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        categoryService.deleteCategory(id, companyId, companyCode, userDetails);
        return ResponseEntity.noContent().build();
    }

    // Legacy test-compatibility overloads
    public ResponseEntity<CategoryResponse> createCategory(com.ticketpro.api.entity.Category category, Long companyId, String companyCode, CustomUserDetails userDetails) {
        com.ticketpro.api.dto.CategoryRequest req = new com.ticketpro.api.dto.CategoryRequest();
        if (category != null) {
            req.setName(category.getName());
            req.setDescription(category.getDescription());
        }
        return createCategory(req, companyId, companyCode, userDetails);
    }

    public ResponseEntity<CategoryResponse> createCategory(com.ticketpro.api.entity.Category category, CustomUserDetails userDetails) {
        return createCategory(category, null, null, userDetails);
    }

    public ResponseEntity<CategoryResponse> updateCategory(Long id, com.ticketpro.api.entity.Category category, CustomUserDetails userDetails) {
        com.ticketpro.api.dto.CategoryRequest req = new com.ticketpro.api.dto.CategoryRequest();
        if (category != null) {
            req.setName(category.getName());
            req.setDescription(category.getDescription());
        }
        return updateCategory(id, req, null, null, userDetails);
    }
}
