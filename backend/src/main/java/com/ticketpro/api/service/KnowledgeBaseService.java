package com.ticketpro.api.service;

import com.ticketpro.api.dto.KnowledgeBaseRequest;
import com.ticketpro.api.entity.Category;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.KbStatus;
import com.ticketpro.api.entity.KnowledgeBase;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.KnowledgeBaseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class KnowledgeBaseService {

    private final KnowledgeBaseRepository kbRepository;
    private final CategoryService categoryService;

    public KnowledgeBaseService(KnowledgeBaseRepository kbRepository, CategoryService categoryService) {
        this.kbRepository = kbRepository;
        this.categoryService = categoryService;
    }

    public List<KnowledgeBase> getAllArticles() {
        return kbRepository.findAll();
    }

    public org.springframework.data.domain.Page<KnowledgeBase> getAllArticlesPaged(org.springframework.data.domain.Pageable pageable) {
        return kbRepository.findAll(pageable);
    }

    public List<KnowledgeBase> getAllArticlesByCompany(Long companyId) {
        return kbRepository.findByCompanyId(companyId);
    }

    public org.springframework.data.domain.Page<KnowledgeBase> getAllArticlesByCompanyPaged(Long companyId, org.springframework.data.domain.Pageable pageable) {
        return kbRepository.findByCompanyId(companyId, pageable);
    }

    public List<KnowledgeBase> getPublishedArticlesByCompany(Long companyId) {
        return kbRepository.findByCompanyIdAndStatus(companyId, KbStatus.PUBLISHED);
    }

    public org.springframework.data.domain.Page<KnowledgeBase> getPublishedArticlesByCompanyPaged(Long companyId, org.springframework.data.domain.Pageable pageable) {
        return kbRepository.findByCompanyIdAndStatus(companyId, KbStatus.PUBLISHED, pageable);
    }

    public KnowledgeBase getArticleById(Long id) {
        return kbRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("KB Article not found with id: " + id));
    }

    @Transactional
    public KnowledgeBase createArticle(KnowledgeBaseRequest request, Company company, User creator) {
        KnowledgeBase article = new KnowledgeBase();
        article.setCompany(company);
        article.setTitle(request.getTitle());
        article.setContent(request.getContent());
        article.setStatus(request.getStatus() != null ? request.getStatus() : KbStatus.DRAFT);
        article.setCreatedBy(creator);

        if (request.getCategoryId() != null) {
            Category category = categoryService.getCategoryById(request.getCategoryId());
            if (!category.getCompany().getId().equals(company.getId())) {
                throw new IllegalArgumentException("Category does not belong to user's company.");
            }
            article.setCategory(category);
        }

        return kbRepository.save(article);
    }

    @Transactional
    public KnowledgeBase updateArticle(Long id, KnowledgeBaseRequest request, Long companyId) {
        KnowledgeBase article = getArticleById(id);
        if (!article.getCompany().getId().equals(companyId)) {
            throw new SecurityException("Unauthorized KB Article modification.");
        }

        article.setTitle(request.getTitle());
        article.setContent(request.getContent());
        if (request.getStatus() != null) {
            article.setStatus(request.getStatus());
        }

        if (request.getCategoryId() != null) {
            Category category = categoryService.getCategoryById(request.getCategoryId());
            if (!category.getCompany().getId().equals(companyId)) {
                throw new IllegalArgumentException("Category does not belong to user's company.");
            }
            article.setCategory(category);
        } else {
            article.setCategory(null);
        }

        return kbRepository.save(article);
    }

    @Transactional
    public void deleteArticle(Long id, Long companyId) {
        KnowledgeBase article = getArticleById(id);
        if (!article.getCompany().getId().equals(companyId)) {
            throw new SecurityException("Unauthorized KB Article deletion.");
        }
        kbRepository.delete(article);
    }

    @Transactional(readOnly = true)
    public com.ticketpro.api.dto.PagedResponse<com.ticketpro.api.dto.KnowledgeBaseResponse> getArticlesPaged(
            com.ticketpro.api.security.CustomUserDetails userDetails,
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<KnowledgeBase> kbPage;
        if (userDetails == null || userDetails.getRole() == com.ticketpro.api.entity.Role.SUPER_ADMIN) {
            kbPage = getAllArticlesPaged(pageable);
        } else if (userDetails.getRole() == com.ticketpro.api.entity.Role.END_USER) {
            kbPage = getPublishedArticlesByCompanyPaged(userDetails.getCompanyId(), pageable);
        } else {
            kbPage = getAllArticlesByCompanyPaged(userDetails.getCompanyId(), pageable);
        }
        return com.ticketpro.api.dto.PagedResponse.from(kbPage, com.ticketpro.api.dto.KnowledgeBaseResponse::from);
    }

    @Transactional(readOnly = true)
    public com.ticketpro.api.dto.KnowledgeBaseResponse getArticleByIdWithTenantCheck(Long id, com.ticketpro.api.security.CustomUserDetails userDetails) {
        KnowledgeBase article = getArticleById(id);
        if (userDetails != null && userDetails.getRole() != com.ticketpro.api.entity.Role.SUPER_ADMIN && article.getCompany() != null && !article.getCompany().getId().equals(userDetails.getCompanyId())) {
            throw new SecurityException("Access Denied: You cannot view articles belonging to another organization.");
        }
        return com.ticketpro.api.dto.KnowledgeBaseResponse.from(article);
    }

    @Transactional
    public com.ticketpro.api.dto.KnowledgeBaseResponse createArticle(KnowledgeBaseRequest request, com.ticketpro.api.security.CustomUserDetails userDetails) {
        Company company = (userDetails != null && userDetails.getUser() != null) ? userDetails.getUser().getCompany() : null;
        User creator = userDetails != null ? userDetails.getUser() : null;
        KnowledgeBase created = createArticle(request, company, creator);
        return com.ticketpro.api.dto.KnowledgeBaseResponse.from(created);
    }

    @Transactional
    public com.ticketpro.api.dto.KnowledgeBaseResponse updateArticle(Long id, KnowledgeBaseRequest request, com.ticketpro.api.security.CustomUserDetails userDetails) {
        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        KnowledgeBase updated = updateArticle(id, request, companyId);
        return com.ticketpro.api.dto.KnowledgeBaseResponse.from(updated);
    }

    @Transactional
    public void deleteArticle(Long id, com.ticketpro.api.security.CustomUserDetails userDetails) {
        Long companyId = userDetails != null ? userDetails.getCompanyId() : null;
        deleteArticle(id, companyId);
    }
}
