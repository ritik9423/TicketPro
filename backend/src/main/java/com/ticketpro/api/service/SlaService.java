package com.ticketpro.api.service;

import com.ticketpro.api.dto.SlaRequest;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.SlaPolicy;
import com.ticketpro.api.entity.SlaStatus;
import com.ticketpro.api.repository.SlaPolicyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SlaService {

    private final SlaPolicyRepository slaPolicyRepository;

    public SlaService(SlaPolicyRepository slaPolicyRepository) {
        this.slaPolicyRepository = slaPolicyRepository;
    }

    public List<SlaPolicy> getAllSlaPolicies() {
        return slaPolicyRepository.findAll();
    }

    public org.springframework.data.domain.Page<SlaPolicy> getAllSlaPoliciesPaged(org.springframework.data.domain.Pageable pageable) {
        return slaPolicyRepository.findAll(pageable);
    }

    public List<SlaPolicy> getSlaPoliciesByCompany(Long companyId) {
        return slaPolicyRepository.findByCompanyId(companyId);
    }

    public org.springframework.data.domain.Page<SlaPolicy> getSlaPoliciesByCompanyPaged(Long companyId, org.springframework.data.domain.Pageable pageable) {
        return slaPolicyRepository.findByCompanyId(companyId, pageable);
    }

    public SlaPolicy getSlaPolicyById(Long id) {
        return slaPolicyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("SLA Policy not found with id: " + id));
    }

    @Transactional
    public SlaPolicy createSlaPolicy(SlaRequest request, Company company) {
        SlaPolicy policy = new SlaPolicy();
        policy.setName(request.getName());
        policy.setPriority(request.getPriority());
        policy.setResponseTimeMinutes(request.getResponseTimeMinutes());
        policy.setResolutionTimeMinutes(request.getResolutionTimeMinutes());
        policy.setStatus(request.getStatus() != null ? request.getStatus() : SlaStatus.ACTIVE);
        policy.setCompany(company);

        return slaPolicyRepository.save(policy);
    }

    @Transactional
    public SlaPolicy updateSlaPolicy(Long id, SlaRequest request, Long companyId) {
        SlaPolicy policy = getSlaPolicyById(id);
        ensureCompanyAccess(policy, companyId);

        if (request.getName() != null) policy.setName(request.getName());
        if (request.getPriority() != null) policy.setPriority(request.getPriority());
        if (request.getResponseTimeMinutes() > 0) policy.setResponseTimeMinutes(request.getResponseTimeMinutes());
        if (request.getResolutionTimeMinutes() > 0) policy.setResolutionTimeMinutes(request.getResolutionTimeMinutes());
        if (request.getStatus() != null) policy.setStatus(request.getStatus());

        return slaPolicyRepository.save(policy);
    }

    @Transactional
    public void deleteSlaPolicy(Long id, Long companyId) {
        SlaPolicy policy = getSlaPolicyById(id);
        ensureCompanyAccess(policy, companyId);
        slaPolicyRepository.delete(policy);
    }

    private void ensureCompanyAccess(SlaPolicy policy, Long companyId) {
        if (companyId == null) {
            return;
        }
        if (policy.getCompany() == null || !companyId.equals(policy.getCompany().getId())) {
            throw new SecurityException("Unauthorized SLA policy access.");
        }
    }

    @Transactional(readOnly = true)
    public com.ticketpro.api.dto.PagedResponse<com.ticketpro.api.dto.SlaPolicyResponse> getSlaPoliciesPaged(
            com.ticketpro.api.security.CustomUserDetails userDetails,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<SlaPolicy> slaPage;
        if (userDetails != null && userDetails.getRole() == com.ticketpro.api.entity.Role.SUPER_ADMIN) {
            slaPage = getAllSlaPoliciesPaged(pageable);
        } else if (userDetails != null && userDetails.getCompanyId() != null) {
            slaPage = getSlaPoliciesByCompanyPaged(userDetails.getCompanyId(), pageable);
        } else {
            slaPage = org.springframework.data.domain.Page.empty(pageable);
        }
        return com.ticketpro.api.dto.PagedResponse.from(slaPage, com.ticketpro.api.dto.SlaPolicyResponse::from);
    }

    @Transactional
    public com.ticketpro.api.dto.SlaPolicyResponse createSlaPolicy(SlaRequest request, com.ticketpro.api.security.CustomUserDetails userDetails) {
        Company company = (userDetails != null && userDetails.getUser() != null) ? userDetails.getUser().getCompany() : null;
        SlaPolicy created = createSlaPolicy(request, company);
        return com.ticketpro.api.dto.SlaPolicyResponse.from(created);
    }

    @Transactional
    public com.ticketpro.api.dto.SlaPolicyResponse updateSlaPolicy(Long id, SlaRequest request, com.ticketpro.api.security.CustomUserDetails userDetails) {
        Long companyId = (userDetails != null && userDetails.getRole() == com.ticketpro.api.entity.Role.SUPER_ADMIN) ? null : (userDetails != null ? userDetails.getCompanyId() : null);
        SlaPolicy updated = updateSlaPolicy(id, request, companyId);
        return com.ticketpro.api.dto.SlaPolicyResponse.from(updated);
    }

    @Transactional
    public void deleteSlaPolicy(Long id, com.ticketpro.api.security.CustomUserDetails userDetails) {
        Long companyId = (userDetails != null && userDetails.getRole() == com.ticketpro.api.entity.Role.SUPER_ADMIN) ? null : (userDetails != null ? userDetails.getCompanyId() : null);
        deleteSlaPolicy(id, companyId);
    }
}
