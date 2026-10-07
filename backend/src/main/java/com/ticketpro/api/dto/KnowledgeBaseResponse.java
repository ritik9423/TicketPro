package com.ticketpro.api.dto;

import com.ticketpro.api.entity.KnowledgeBase;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * KnowledgeBase response DTO. Prevents direct entity exposure.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseResponse {
    private Long id;
    private Long companyId;
    private String companyName;
    private String title;
    private String content;
    private Long categoryId;
    private String categoryName;
    private String status;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static KnowledgeBaseResponse from(KnowledgeBase kb) {
        if (kb == null) return null;
        KnowledgeBaseResponse dto = new KnowledgeBaseResponse();
        dto.setId(kb.getId());
        dto.setTitle(kb.getTitle());
        dto.setContent(kb.getContent());
        dto.setStatus(kb.getStatus() != null ? kb.getStatus().name() : null);
        dto.setCreatedAt(kb.getCreatedAt());
        dto.setUpdatedAt(kb.getUpdatedAt());
        try {
            if (kb.getCompany() != null) {
                dto.setCompanyId(kb.getCompany().getId());
                dto.setCompanyName(kb.getCompany().getCompanyName());
            }
        } catch (Exception ignored) {}
        try {
            if (kb.getCategory() != null) {
                dto.setCategoryId(kb.getCategory().getId());
                dto.setCategoryName(kb.getCategory().getName());
            }
        } catch (Exception ignored) {}
        try {
            if (kb.getCreatedBy() != null) {
                dto.setCreatedById(kb.getCreatedBy().getId());
                dto.setCreatedByName(kb.getCreatedBy().getName());
            }
        } catch (Exception ignored) {}
        return dto;
    }

    public Map<String, Object> getCategory() {
        if (categoryId == null && (categoryName == null || categoryName.isBlank())) return null;
        Map<String, Object> map = new HashMap<>();
        map.put("id", categoryId);
        map.put("name", categoryName);
        return map;
    }

    public Map<String, Object> getCreatedBy() {
        if (createdById == null && (createdByName == null || createdByName.isBlank())) return null;
        Map<String, Object> map = new HashMap<>();
        map.put("id", createdById);
        map.put("name", createdByName);
        return map;
    }
}
