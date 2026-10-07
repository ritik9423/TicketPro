package com.ticketpro.api.dto;

import com.ticketpro.api.entity.CompanyStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * DTO for company update requests.
 * Only exposes safe fields — status changes are restricted to SUPER_ADMIN at the controller level.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CompanyUpdateRequest {
    private String companyName;
    private String email;
    private String phone;
    private String address;
    private String website;
    private String customFields;
    private CompanyStatus status;
}
