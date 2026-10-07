package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.entity.UserStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Sanitized User response DTO.
 * Excludes password hash, internal relations, and sensitive audit fields.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String department;
    private Role role;
    private UserStatus status;
    private Long companyId;
    private String companyName;
    private String companyCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static UserResponse from(User user) {
        if (user == null) return null;
        UserResponse dto = new UserResponse();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setDepartment(user.getDepartment());
        dto.setRole(user.getRole());
        dto.setStatus(user.getStatus());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        try {
            if (user.getCompany() != null) {
                dto.setCompanyId(user.getCompany().getId());
                dto.setCompanyName(user.getCompany().getCompanyName());
                dto.setCompanyCode(user.getCompany().getCompanyCode());
            }
        } catch (Exception e) {
            // LazyInitializationException safe — company data may not be loaded
        }
        return dto;
    }
}
