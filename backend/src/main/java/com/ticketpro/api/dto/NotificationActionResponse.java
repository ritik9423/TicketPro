package com.ticketpro.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Response payload for notification management actions")
public class NotificationActionResponse {

    @Schema(description = "Indicates whether the action succeeded", example = "true")
    private boolean success;

    @Schema(description = "Notification ID affected by the action, if applicable", example = "42")
    private Long id;
}
