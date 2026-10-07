package com.ticketpro.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CompanyRegisterRequest {
    // Company Info
    private String companyName;
    private String name;

    private String companyCode;

    @NotBlank(message = "Company email is required")
    private String email;

    private String phone;
    private String address;
    private String website;

    // Admin Info
    private String adminName;

    @NotBlank(message = "Admin email is required")
    private String adminEmail;

    @NotBlank(message = "Admin password is required")
    private String adminPassword;

    private String adminPhone;
    private String customFields;
    private String logoUrl;

    public String getCompanyName() {
        if (companyName != null && !companyName.isBlank()) {
            return companyName.trim();
        }
        if (name != null && !name.isBlank()) {
            return name.trim();
        }
        return "New Organization";
    }

    public String getAdminName() {
        if (adminName != null && !adminName.isBlank()) {
            return adminName.trim();
        }
        return getCompanyName() + " Admin";
    }
}
