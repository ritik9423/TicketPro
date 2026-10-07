package com.ticketpro.api.dto.outpost;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * DTO representing the response from Outpost OAuth 2.0 introspection endpoint:
 * POST /api/security/oauth/check_token
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OutpostCheckTokenResponse {

    private Boolean active;

    @JsonProperty("client_id")
    private String clientId;

    private Long exp;

    /**
     * Accepts either List or space-delimited String from Outpost server
     */
    private Object scope;

    @JsonProperty("user_name")
    private String userName;

    @JsonProperty("api")
    private String api;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("email")
    private String email;

    @JsonProperty("status")
    private String status;

    private String error;

    @JsonProperty("error_description")
    private String errorDescription;

    public boolean isTokenActive() {
        if (active != null) {
            return active;
        }
        return error == null && (userName != null || clientId != null || email != null);
    }

    @SuppressWarnings("unchecked")
    public List<String> getScopes() {
        if (scope == null) {
            return Collections.emptyList();
        }
        if (scope instanceof List<?>) {
            return (List<String>) scope;
        }
        if (scope instanceof String str) {
            return Arrays.asList(str.split(" "));
        }
        return Collections.emptyList();
    }
}
