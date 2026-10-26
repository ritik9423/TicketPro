package com.ticketpro.api.controller;

import com.ticketpro.api.dto.KnowledgeBaseRequest;
import com.ticketpro.api.dto.KnowledgeBaseResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.KnowledgeBaseService;
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
 * Enterprise Multi-Tenant Knowledge Base Controller.
 * Manages self-service documentation, helpdesk manuals, and published FAQs.
 */
@RestController
@RequestMapping(path = {"/api/v1/kb", "/api/v1/knowledge-base", "/api/kb", "/api/knowledge-base"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Knowledge Base", description = "Endpoints for managing self-service helpdesk articles, FAQs, and documentation.")
public class KnowledgeBaseController {

    private final KnowledgeBaseService kbService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get paginated knowledge base articles",
            description = "Retrieves self-service articles scoped to the caller's tenant. End-users receive published articles only."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Articles retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = PagedResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid pagination parameters", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content)
    })
    public ResponseEntity<PagedResponse<KnowledgeBaseResponse>> getArticles(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PagedResponse<KnowledgeBaseResponse> articles = kbService.getArticlesPaged(userDetails, pageable);
        return ResponseEntity.ok(articles);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Get article by ID",
            description = "Retrieves a knowledge base article by ID with tenant verification."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Article retrieved successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = KnowledgeBaseResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid article ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant access denied", content = @Content),
            @ApiResponse(responseCode = "404", description = "Article not found", content = @Content)
    })
    public ResponseEntity<KnowledgeBaseResponse> getArticleById(
            @Parameter(description = "ID of the article", required = true, example = "10")
            @PathVariable("id")
            @Positive(message = "Article ID must be a positive integer") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        KnowledgeBaseResponse article = kbService.getArticleByIdWithTenantCheck(id, userDetails);
        return ResponseEntity.ok(article);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT')")
    @Operation(
            summary = "Create knowledge base article",
            description = "Creates a new help article or draft FAQ. Automatically associated with caller's company."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Article created successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = KnowledgeBaseResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed for article payload", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Insufficient permissions", content = @Content)
    })
    public ResponseEntity<KnowledgeBaseResponse> createArticle(
            @Valid @RequestBody KnowledgeBaseRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        KnowledgeBaseResponse created = kbService.createArticle(request, userDetails);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT')")
    @Operation(
            summary = "Update knowledge base article",
            description = "Updates article title, content, or publication status with strict tenant ownership validation."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Article updated successfully",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = KnowledgeBaseResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation failed or invalid ID", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "Article not found", content = @Content)
    })
    public ResponseEntity<KnowledgeBaseResponse> updateArticle(
            @Parameter(description = "ID of the article to update", required = true, example = "10")
            @PathVariable("id")
            @Positive(message = "Article ID must be a positive integer") Long id,
            @Valid @RequestBody KnowledgeBaseRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        KnowledgeBaseResponse updated = kbService.updateArticle(id, request, userDetails);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT')")
    @Operation(
            summary = "Delete knowledge base article",
            description = "Deletes an article permanently after verifying tenant ownership."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Article deleted successfully (no content)"),
            @ApiResponse(responseCode = "400", description = "Invalid ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Tenant boundary violation", content = @Content),
            @ApiResponse(responseCode = "404", description = "Article not found", content = @Content)
    })
    public ResponseEntity<Void> deleteArticle(
            @Parameter(description = "ID of the article to delete", required = true, example = "10")
            @PathVariable("id")
            @Positive(message = "Article ID must be a positive integer") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        kbService.deleteArticle(id, userDetails);
        return ResponseEntity.noContent().build();
    }
}
