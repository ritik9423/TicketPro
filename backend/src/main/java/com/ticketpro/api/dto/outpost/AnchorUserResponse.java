package com.ticketpro.api.dto.outpost;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Response DTO for Mappls Anchor User Creation API
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AnchorUserResponse {

    private Boolean success;

    private String status;

    private String message;

    private Object data;

    private String error;

    @JsonProperty("error_description")
    private String errorDescription;

    @JsonProperty("raw_response")
    private Map<String, Object> rawResponse;
}
