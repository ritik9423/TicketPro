package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Role;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private Long id;
    private String name;
    private String email;
    private Role role;
    private Long companyId;
    private String companyName;
    private String companyCode;
    private String logoUrl;
    private String primaryColor;
    private String customFields;
    private Boolean outpostActive;
    private String outpostAccessToken;

    public Long getUserId() {
        return this.id;
    }

    public LoginResponse(String token, Long id, String name, String email, Role role, Long companyId, String companyName, String companyCode, String logoUrl, String primaryColor, String customFields) {
        this.token = token;
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.companyId = companyId;
        this.companyName = companyName;
        this.companyCode = companyCode;
        this.logoUrl = logoUrl;
        this.primaryColor = primaryColor;
        this.customFields = customFields;
        this.outpostActive = false;
        this.outpostAccessToken = null;
    }
}
