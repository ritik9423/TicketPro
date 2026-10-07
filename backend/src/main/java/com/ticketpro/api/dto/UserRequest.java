package com.ticketpro.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.UserStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {
    private String name;
    private String email;
    private String password;
    private String phone;
    private String department;
    private Long companyId;
    private Role role;
    private UserStatus status;

    /**
     * Optional Mappls Anchor workspace username (usernamesws)
     */
    @JsonProperty("usernamesws")
    private String usernamesws;

    /**
     * Whether to sync/provision this user to Mappls Anchor
     */
    @JsonProperty("syncToAnchor")
    private Boolean syncToAnchor;
}
