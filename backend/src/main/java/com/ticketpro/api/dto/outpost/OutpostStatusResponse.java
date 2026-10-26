package com.ticketpro.api.dto.outpost;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Diagnostic status of Outpost OAuth 2.0 integration")
public class OutpostStatusResponse {

    @Schema(description = "Whether Outpost client ID and secret are configured", example = "true")
    private boolean configured;

    @Schema(description = "Configuration state of client ID", example = "configured")
    private String clientId;

    @Schema(description = "Count of active user sessions", example = "5")
    private int activeSessions;

    @Schema(description = "Count of cached introspections", example = "3")
    private int cachedIntrospections;
}
