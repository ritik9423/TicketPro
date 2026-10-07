package com.ticketpro.api.dto.outpost;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload for Mappls Anchor User Creation API:
 * POST https://anchor.mappls.com/api/users/
 * Header: authorization: bearer <token>
 * Header: content-type: application/json
 * Body: {"name":"TestUser","usernamesws":"testuse11r@example.com","email":"tesadr012@example.com","password":"mapplsQ1234"}
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AnchorUserRequest {

    @NotBlank(message = "Name is required")
    private String name;

    /**
     * Workspace username on Mappls Anchor (usernamesws)
     */
    @NotBlank(message = "usernamesws is required")
    @JsonProperty("usernamesws")
    private String usernamesws;

    @NotBlank(message = "Email is required")
    @Email(message = "Valid email address is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;
}
