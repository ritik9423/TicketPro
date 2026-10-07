package com.ticketpro.api.controller;

import com.ticketpro.api.dto.KnowledgeBaseRequest;
import com.ticketpro.api.entity.KnowledgeBase;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.KnowledgeBaseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ticketpro.api.dto.KnowledgeBaseResponse;
import com.ticketpro.api.dto.PagedResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;


@RestController
@RequestMapping({"/api/kb", "/api/knowledge-base"})
public class KnowledgeBaseController {

    private final KnowledgeBaseService kbService;

    public KnowledgeBaseController(KnowledgeBaseService kbService) {
        this.kbService = kbService;
    }

    @GetMapping
    public ResponseEntity<?> getArticles(
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Pageable pageable) {
        int pageNum = page != null ? page : 0;
        int pageSize = Math.min(size != null ? size : 20, 100);
        Pageable paged = PageRequest.of(pageNum, pageSize, pageable.getSort());
        Page<KnowledgeBase> kbPage;
        if (userDetails == null || userDetails.getRole() == Role.SUPER_ADMIN) {
            kbPage = kbService.getAllArticlesPaged(paged);
        } else if (userDetails.getRole() == Role.END_USER) {
            kbPage = kbService.getPublishedArticlesByCompanyPaged(userDetails.getCompanyId(), paged);
        } else {
            kbPage = kbService.getAllArticlesByCompanyPaged(userDetails.getCompanyId(), paged);
        }
        return ResponseEntity.ok(PagedResponse.from(kbPage, KnowledgeBaseResponse::from));
    }

    @GetMapping("/{id}")
    public ResponseEntity<KnowledgeBaseResponse> getArticleById(@PathVariable("id") Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        KnowledgeBase article = kbService.getArticleById(id);
        if (userDetails != null && userDetails.getRole() != Role.SUPER_ADMIN && article.getCompany() != null && !article.getCompany().getId().equals(userDetails.getCompanyId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(KnowledgeBaseResponse.from(article));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT')")
    public ResponseEntity<?> createArticle(@Valid @RequestBody KnowledgeBaseRequest request, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }
        try {
            KnowledgeBase created = kbService.createArticle(request, userDetails.getUser() != null ? userDetails.getUser().getCompany() : null, userDetails.getUser());
            return ResponseEntity.status(HttpStatus.CREATED).body(KnowledgeBaseResponse.from(created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT')")
    public ResponseEntity<?> updateArticle(@PathVariable("id") Long id, @Valid @RequestBody KnowledgeBaseRequest request, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }
        try {
            KnowledgeBase updated = kbService.updateArticle(id, request, userDetails.getCompanyId());
            return ResponseEntity.ok(KnowledgeBaseResponse.from(updated));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT')")
    public ResponseEntity<?> deleteArticle(@PathVariable("id") Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }
        try {
            kbService.deleteArticle(id, userDetails.getCompanyId());
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }
}
