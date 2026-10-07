package com.ticketpro.api.dto.outpost;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing the response from Outpost OAuth 2.0 token endpoint:
 * POST /api/security/oauth/token
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class OutpostTokenResponse {

    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("token")
    private String token;

    @JsonProperty("token_type")
    private String tokenType;

    @JsonProperty("expires_in")
    private Long expiresIn;

    @JsonProperty("refresh_token")
    private String refreshToken;

    @JsonProperty("scope")
    private String scope;

    @JsonProperty("project_id")
    private String projectId;

    @JsonProperty("error")
    private String error;

    @JsonProperty("error_description")
    private String errorDescription;

    /**
     * Helper to return access_token or fallback token attribute
     */
    public String getAccessToken() {
        if (accessToken != null && !accessToken.isBlank()) {
            return accessToken;
        }
        return token;
    }

    public String getEffectiveToken() {
        return getAccessToken();
    }
}
