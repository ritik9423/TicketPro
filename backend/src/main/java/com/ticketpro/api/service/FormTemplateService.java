package com.ticketpro.api.service;

import com.ticketpro.api.dto.*;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class FormTemplateService {

    private final FormTemplateRepository formTemplateRepository;
    private final CompanyRepository companyRepository;
    private final CategoryRepository categoryRepository;
    private final TicketRepository ticketRepository;
    private final FormSubmissionValueRepository formSubmissionValueRepository;

    public FormTemplateService(FormTemplateRepository formTemplateRepository,
                               CompanyRepository companyRepository,
                               CategoryRepository categoryRepository,
                               TicketRepository ticketRepository,
                               FormSubmissionValueRepository formSubmissionValueRepository) {
        this.formTemplateRepository = formTemplateRepository;
        this.companyRepository = companyRepository;
        this.categoryRepository = categoryRepository;
        this.ticketRepository = ticketRepository;
        this.formSubmissionValueRepository = formSubmissionValueRepository;
    }

    @Transactional
    public FormTemplateResponse createFormTemplate(FormTemplateRequest request, Long callerCompanyId, Role callerRole, User creator) {
        Long targetCompanyId = (callerRole == Role.SUPER_ADMIN && request.getCompanyId() != null)
                ? request.getCompanyId()
                : callerCompanyId;

        if (targetCompanyId == null) {
            throw new IllegalArgumentException("Company ID is required to create a form template.");
        }

        Company company = companyRepository.findById(targetCompanyId)
                .orElseThrow(() -> new IllegalArgumentException("Company not found with id: " + targetCompanyId));

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + request.getCategoryId()));
            if (!category.getCompany().getId().equals(company.getId())) {
                throw new IllegalArgumentException("Category does not belong to the target company.");
            }
        }

        FormTemplate template = new FormTemplate();
        template.setCompany(company);
        template.setCategory(category);
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        template.setCreatedBy(creator);
        template.setVersion(1);

        populateFields(template, request.getFields());

        FormTemplate saved = formTemplateRepository.save(template);
        log.info("Created FormTemplate id={} for company={}", saved.getId(), company.getCompanyName());
        return FormTemplateResponse.from(saved);
    }

    @Transactional
    public FormTemplateResponse updateFormTemplate(Long id, FormTemplateRequest request, Long callerCompanyId, Role callerRole) {
        FormTemplate existingTemplate = formTemplateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Form template not found with id: " + id));

        validateTenantAccess(existingTemplate, callerCompanyId, callerRole);

        Category targetCategory = existingTemplate.getCategory();
        if (request.getCategoryId() != null) {
            targetCategory = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found with id: " + request.getCategoryId()));
            if (!targetCategory.getCompany().getId().equals(existingTemplate.getCompany().getId())) {
                throw new IllegalArgumentException("Category does not belong to the template's company.");
            }
        }

        // Determine next immutable version number for this company and category
        int highestVersion = existingTemplate.getVersion();
        if (targetCategory != null && targetCategory.getId() != null) {
            Optional<FormTemplate> latestOpt = formTemplateRepository.findFirstByCompanyIdAndCategoryIdOrderByVersionDesc(
                    existingTemplate.getCompany().getId(), targetCategory.getId());
            if (latestOpt.isPresent() && latestOpt.get().getVersion() > highestVersion) {
                highestVersion = latestOpt.get().getVersion();
            }
        }
        int nextVersion = highestVersion + 1;

        // Archive current template version so active template queries resolve to the new version
        if ("ACTIVE".equalsIgnoreCase(existingTemplate.getStatus())) {
            existingTemplate.setStatus("ARCHIVED");
            formTemplateRepository.save(existingTemplate);
        }

        // Create a NEW immutable FormTemplate version record
        FormTemplate newVersionTemplate = new FormTemplate();
        newVersionTemplate.setCompany(existingTemplate.getCompany());
        newVersionTemplate.setCategory(targetCategory);
        newVersionTemplate.setName(request.getName());
        newVersionTemplate.setDescription(request.getDescription());
        newVersionTemplate.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        newVersionTemplate.setCreatedBy(existingTemplate.getCreatedBy());
        newVersionTemplate.setVersion(nextVersion);

        populateFields(newVersionTemplate, request.getFields());

        FormTemplate saved = formTemplateRepository.save(newVersionTemplate);
        log.info("Created new immutable FormTemplate version id={} version={} (previous id={})",
                saved.getId(), saved.getVersion(), existingTemplate.getId());
        return FormTemplateResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public PagedResponse<FormTemplateResponse> getFormTemplates(Long callerCompanyId, Role callerRole, Pageable pageable) {
        Page<FormTemplate> page;
        if (callerRole == Role.SUPER_ADMIN && callerCompanyId == null) {
            page = formTemplateRepository.findAll(pageable);
        } else {
            if (callerCompanyId == null) {
                throw new SecurityException("Unauthorized: missing company context.");
            }
            page = formTemplateRepository.findByCompanyId(callerCompanyId, pageable);
        }
        return PagedResponse.from(page, FormTemplateResponse::from);
    }

    @Transactional(readOnly = true)
    public FormTemplateResponse getFormTemplateById(Long id, Long callerCompanyId, Role callerRole) {
        FormTemplate template = formTemplateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Form template not found with id: " + id));
        validateTenantAccess(template, callerCompanyId, callerRole);
        return FormTemplateResponse.from(template);
    }

    @Transactional(readOnly = true)
    public FormTemplateResponse getFormTemplateByCategoryId(Long categoryId, Long callerCompanyId, Role callerRole) {
        FormTemplate template = null;
        if (callerCompanyId != null) {
            template = formTemplateRepository.findFirstByCompanyIdAndCategoryIdAndStatusOrderByVersionDesc(callerCompanyId, categoryId, "ACTIVE")
                    .orElse(null);
        }
        if (template == null) {
            template = formTemplateRepository.findFirstByCategoryIdAndStatusOrderByVersionDesc(categoryId, "ACTIVE")
                    .orElse(null);
        }
        if (template == null) {
            template = formTemplateRepository.findFirstByCategoryIdOrderByVersionDesc(categoryId)
                    .orElse(null);
        }
        if (template == null) return null;
        validateTenantAccess(template, callerCompanyId, callerRole);
        return FormTemplateResponse.from(template);
    }

    @Transactional
    public void deleteFormTemplate(Long id, Long callerCompanyId, Role callerRole) {
        FormTemplate template = formTemplateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Form template not found with id: " + id));
        validateTenantAccess(template, callerCompanyId, callerRole);

        // Historical data protection: reject deletion if referenced by tickets or submissions
        boolean isReferencedByTickets = ticketRepository != null && ticketRepository.existsByFormTemplateId(id);
        boolean isReferencedBySubmissions = formSubmissionValueRepository != null && formSubmissionValueRepository.existsByFieldFormTemplateId(id);

        if (isReferencedByTickets || isReferencedBySubmissions) {
            template.setStatus("ARCHIVED");
            formTemplateRepository.save(template);
            throw new IllegalStateException("Form template id=" + id + " is referenced by existing tickets or historical submissions and cannot be deleted. It has been archived instead to preserve historical records.");
        }

        // Unreferenced draft template: soft delete / archive to ensure no physical deletion
        template.setStatus("ARCHIVED");
        formTemplateRepository.save(template);
        log.info("Soft-deleted (archived) FormTemplate id={}", id);
    }

    private void populateFields(FormTemplate template, List<FormFieldDto> fieldDtos) {
        if (fieldDtos == null) return;
        int order = 0;
        for (FormFieldDto dto : fieldDtos) {
            FormField field = new FormField();
            field.setFormTemplate(template);
            field.setFieldType(dto.getFieldType() != null ? dto.getFieldType().toUpperCase() : "TEXT");
            field.setLabel(dto.getLabel());
            field.setFieldKey(dto.getFieldKey() != null ? dto.getFieldKey() : "field_" + System.currentTimeMillis() + "_" + order);
            field.setPlaceholder(dto.getPlaceholder());
            field.setRequired(dto.getRequired() != null ? dto.getRequired() : false);
            field.setDisplayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : order++);
            field.setValidationConfig(dto.getValidationConfig());
            field.setFieldConfig(dto.getFieldConfig());

            if (dto.getOptions() != null) {
                int optOrder = 0;
                for (FormFieldOptionDto optDto : dto.getOptions()) {
                    FormFieldOption option = new FormFieldOption();
                    option.setField(field);
                    option.setLabel(optDto.getLabel());
                    option.setValue(optDto.getValue());
                    option.setDisplayOrder(optDto.getDisplayOrder() != null ? optDto.getDisplayOrder() : optOrder++);
                    field.getOptions().add(option);
                }
            }

            template.getFields().add(field);
        }
    }

    private void validateTenantAccess(FormTemplate template, Long callerCompanyId, Role callerRole) {
        if (callerRole != Role.SUPER_ADMIN) {
            if (callerCompanyId == null || template.getCompany() == null || !callerCompanyId.equals(template.getCompany().getId())) {
                throw new SecurityException("Unauthorized: cross-tenant form template access is denied.");
            }
        }
    }
}
