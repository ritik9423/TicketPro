package com.ticketpro.api.controller;

import com.ticketpro.api.dto.FormTemplateRequest;
import com.ticketpro.api.dto.FormTemplateResponse;
import com.ticketpro.api.dto.PagedResponse;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.FormTemplateService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/form-templates")
public class FormTemplateController {

    private final FormTemplateService formTemplateService;

    public FormTemplateController(FormTemplateService formTemplateService) {
        this.formTemplateService = formTemplateService;
    }

    @GetMapping
    public ResponseEntity<PagedResponse<FormTemplateResponse>> getFormTemplates(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Pageable pageable) {
        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        var role = userDetails != null ? userDetails.getRole() : null;
        return ResponseEntity.ok(formTemplateService.getFormTemplates(companyId, role, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormTemplateResponse> getFormTemplateById(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        var role = userDetails != null ? userDetails.getRole() : null;
        return ResponseEntity.ok(formTemplateService.getFormTemplateById(id, companyId, role));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<FormTemplateResponse> getFormTemplateByCategoryId(
            @PathVariable("categoryId") Long categoryId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        var role = userDetails != null ? userDetails.getRole() : null;
        FormTemplateResponse response = formTemplateService.getFormTemplateByCategoryId(categoryId, companyId, role);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    public ResponseEntity<FormTemplateResponse> createFormTemplate(
            @Valid @RequestBody FormTemplateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        var role = userDetails != null ? userDetails.getRole() : null;
        var creator = userDetails != null ? userDetails.getUser() : null;
        FormTemplateResponse created = formTemplateService.createFormTemplate(request, companyId, role, creator);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
    public ResponseEntity<FormTemplateResponse> updateFormTemplate(
            @PathVariable("id") Long id,
            @Valid @RequestBody FormTemplateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        var role = userDetails != null ? userDetails.getRole() : null;
        FormTemplateResponse updated = formTemplateService.updateFormTemplate(id, request, companyId, role);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<Void> deleteFormTemplate(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        var role = userDetails != null ? userDetails.getRole() : null;
        formTemplateService.deleteFormTemplate(id, companyId, role);
        return ResponseEntity.noContent().build();
    }
}
