package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CategoryResponse;
import com.ticketpro.api.service.CategoryService;
import com.ticketpro.api.repository.CategoryRepository;
import com.ticketpro.api.repository.CompanyRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public Guest Customer Support Category Controller.
 * Provides public, rate-limited category lookup for guest ticket intake forms.
 * Delegates all company existence and active-status checks to {@link CategoryService}.
 */
@RestController
@RequestMapping(path = {"/api/v1/public/companies", "/api/public/companies"})
@Validated
@Tag(name = "Public Customer Support", description = "Public endpoints for unauthenticated guest ticket creation and company category resolution.")
public class PublicCategoryController {

    private final CategoryService categoryService;

    @org.springframework.beans.factory.annotation.Autowired
    public PublicCategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    // Legacy test-compatibility constructor
    public PublicCategoryController(CompanyRepository companyRepository, CategoryRepository categoryRepository) {
        this(new CategoryService(categoryRepository, companyRepository));
    }

    @GetMapping("/{companyCode}/categories")
    @Operation(
            summary = "Get active categories for guest ticket form",
            description = "Retrieves active categories for an active organization by its company code without requiring user login."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Public categories retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, array = @ArraySchema(schema = @Schema(implementation = CategoryResponse.class)))),
            @ApiResponse(responseCode = "400", description = "Invalid or empty company code supplied", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Organization account is suspended or inactive", content = @Content),
            @ApiResponse(responseCode = "404", description = "Company not found with given code", content = @Content)
    })
    public ResponseEntity<List<CategoryResponse>> getPublicCategories(
            @Parameter(description = "Corporate identifier code of the company", required = true, example = "HDFCBANK")
            @PathVariable("companyCode")
            @NotBlank(message = "Company code is required") String companyCode
    ) {
        if (companyCode == null || companyCode.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            List<CategoryResponse> categories = categoryService.getPublicCategoriesByCompanyCode(companyCode);
            return ResponseEntity.ok(categories);
        } catch (com.ticketpro.api.exception.ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (SecurityException e) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
    }
}
