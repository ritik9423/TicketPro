package com.ticketpro.api.controller;

import com.ticketpro.api.dto.FormTemplateRequest;
import com.ticketpro.api.dto.FormTemplateResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.FormTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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

/**
 * Enterprise Dynamic Form Template Controller.
 * Manages category-specific custom intake fields, dynamic schemas, and validation rules.
 */
@RestController
@RequestMapping(path = {"/api/v1/form-templates", "/api/form-templates"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Form Templates", description = "Endpoints for configurable dynamic ticket fields, validation schemas, and intake forms.")
public class FormTemplateController {

    private final FormTemplateService formTemplateService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get form templates",
            description = "Retrieves paginated custom form templates configured for the caller's tenant. Super Admins view all templates."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Form templates retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid pagination arguments", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content)
    })
    public ResponseEntity<PagedResponse<FormTemplateResponse>> getFormTemplates(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PagedResponse<FormTemplateResponse> templates = formTemplateService.getFormTemplates(userDetails, pageable);
        return ResponseEntity.ok(templates);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get form template by ID",
            description = "Retrieves a custom intake form schema with all configured field definitions and dropdown options."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Form template retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FormTemplateResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid template ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content),
            @ApiResponse(responseCode = "404", description = "Form template not found", content = @Content)
    })
    public ResponseEntity<FormTemplateResponse> getFormTemplateById(
            @Parameter(description = "ID of the form template", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Template ID must be a positive integer") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        FormTemplateResponse response = formTemplateService.getFormTemplateById(id, userDetails);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/category/{categoryId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get form template by category ID",
            description = "Retrieves the active dynamic intake schema mapped to a specific support category."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Category form template retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FormTemplateResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid category ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "404", description = "No active template mapped to category", content = @Content)
    })
    public ResponseEntity<FormTemplateResponse> getFormTemplateByCategoryId(
            @Parameter(description = "Category ID to find template for", required = true, example = "3")
            @PathVariable("categoryId")
            @Positive(message = "Category ID must be a positive integer") Long categoryId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        FormTemplateResponse response = formTemplateService.getFormTemplateByCategoryId(categoryId, userDetails);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    @Operation(
            summary = "Create custom form template",
            description = "Configures a new dynamic intake form template with custom fields for a specific category."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Form template created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FormTemplateResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed for form template body", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content)
    })
    public ResponseEntity<FormTemplateResponse> createFormTemplate(
            @Valid @RequestBody FormTemplateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        FormTemplateResponse created = formTemplateService.createFormTemplate(request, userDetails);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    @Operation(
            summary = "Update form template",
            description = "Publishes a new immutable version of the form template while archiving previous schema revisions."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Form template versioned and updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = FormTemplateResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or invalid ID", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "Form template not found", content = @Content)
    })
    public ResponseEntity<FormTemplateResponse> updateFormTemplate(
            @Parameter(description = "ID of the form template to update", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Template ID must be a positive integer") Long id,
            @Valid @RequestBody FormTemplateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        FormTemplateResponse updated = formTemplateService.updateFormTemplate(id, request, userDetails);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    @Operation(
            summary = "Delete or archive form template",
            description = "Archives form template if existing tickets reference its custom fields; permanently deletes if unused."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Form template removed or archived successfully (no content)"),
            @ApiResponse(responseCode = "400", description = "Invalid ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "Form template not found", content = @Content)
    })
    public ResponseEntity<Void> deleteFormTemplate(
            @Parameter(description = "ID of the form template to delete", required = true, example = "1")
            @PathVariable("id")
            @Positive(message = "Template ID must be a positive integer") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        formTemplateService.deleteFormTemplate(id, userDetails);
        return ResponseEntity.noContent().build();
    }
}
