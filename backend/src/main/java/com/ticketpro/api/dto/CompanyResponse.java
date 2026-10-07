package com.ticketpro.api.dto;

import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.CompanyStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Company response DTO.
 * Excludes internal customFields and other sensitive configuration.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CompanyResponse {
    private Long id;
    private String companyName;
    private String companyCode;
    private String email;
    private String phone;
    private String address;
    private String website;
    private CompanyStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CompanyResponse from(Company company) {
        if (company == null) return null;
        CompanyResponse dto = new CompanyResponse();
        dto.setId(company.getId());
        dto.setCompanyName(company.getCompanyName());
        dto.setCompanyCode(company.getCompanyCode());
        dto.setEmail(company.getEmail());
        dto.setPhone(company.getPhone());
        dto.setAddress(company.getAddress());
        dto.setWebsite(company.getWebsite());
        dto.setStatus(company.getStatus());
        dto.setCreatedAt(company.getCreatedAt());
        dto.setUpdatedAt(company.getUpdatedAt());
        return dto;
    }
}
