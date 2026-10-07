package com.ticketpro.api.controller;

import com.ticketpro.api.dto.SlaRequest;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.SlaPolicy;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.SlaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping({"/api/sla", "/api/sla-policies"})
public class SlaController {

    private final SlaService slaService;

    public SlaController(SlaService slaService) {
        this.slaService = slaService;
    }

    @GetMapping
    public ResponseEntity<?> getSlaPolicies(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            org.springframework.data.domain.Pageable pageable) {
        int pageNum = page != null ? page : 0;
        int pageSize = Math.min(size != null ? size : 20, 100);
        org.springframework.data.domain.Pageable paged = org.springframework.data.domain.PageRequest.of(pageNum, pageSize, pageable.getSort());
        org.springframework.data.domain.Page<SlaPolicy> slaPage;
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            slaPage = slaService.getAllSlaPoliciesPaged(paged);
        } else {
            slaPage = slaService.getSlaPoliciesByCompanyPaged(userDetails.getCompanyId(), paged);
        }
        return ResponseEntity.ok(com.ticketpro.api.dto.PagedResponse.from(slaPage, com.ticketpro.api.dto.SlaPolicyResponse::from));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<?> createSlaPolicy(@Valid @RequestBody SlaRequest request, @AuthenticationPrincipal CustomUserDetails userDetails) {
        try {
            SlaPolicy created = slaService.createSlaPolicy(request, userDetails.getUser().getCompany());
            return ResponseEntity.status(HttpStatus.CREATED).body(com.ticketpro.api.dto.SlaPolicyResponse.from(created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<?> updateSlaPolicy(@PathVariable("id") Long id, @Valid @RequestBody SlaRequest request, @AuthenticationPrincipal CustomUserDetails userDetails) {
        try {
            SlaPolicy updated = slaService.updateSlaPolicy(id, request, userDetails.getCompanyId());
            return ResponseEntity.ok(com.ticketpro.api.dto.SlaPolicyResponse.from(updated));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN')")
    public ResponseEntity<?> deleteSlaPolicy(@PathVariable("id") Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        try {
            slaService.deleteSlaPolicy(id, userDetails.getCompanyId());
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }
}
