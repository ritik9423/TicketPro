package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Comment response DTO. Prevents JPA entity exposure and sensitive user fields.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponse {
    private Long id;
    private Long ticketId;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userRole;
    private String comment;
    private boolean isInternal;
    private LocalDateTime createdAt;

    public static CommentResponse from(Comment comment) {
        if (comment == null) return null;
        CommentResponse dto = new CommentResponse();
        dto.setId(comment.getId());
        dto.setComment(comment.getComment());
        dto.setInternal(comment.isInternal());
        dto.setCreatedAt(comment.getCreatedAt());
        try {
            if (comment.getTicket() != null) {
                dto.setTicketId(comment.getTicket().getId());
            }
        } catch (Exception ignored) {}
        try {
            if (comment.getUser() != null) {
                dto.setUserId(comment.getUser().getId());
                dto.setUserName(comment.getUser().getName());
                dto.setUserEmail(comment.getUser().getEmail());
                if (comment.getUser().getRole() != null) {
                    dto.setUserRole(comment.getUser().getRole().name());
                }
            }
        } catch (Exception ignored) {}
        return dto;
    }

    public Map<String, Object> getUser() {
        if (userId == null && (userName == null || userName.isBlank())) {
            return null;
        }
        Map<String, Object> map = new HashMap<>();
        map.put("id", userId);
        map.put("name", userName);
        map.put("email", userEmail);
        map.put("role", userRole);
        return map;
    }
}
