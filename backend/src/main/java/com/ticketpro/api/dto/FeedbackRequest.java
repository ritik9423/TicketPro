package com.ticketpro.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackRequest {

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5 stars")
    @Max(value = 5, message = "Rating must be between 1 and 5 stars")
    private Integer rating;

    private String feedback;

    private List<String> tags;

    private String customerName;

    private String customerEmail;

    @com.fasterxml.jackson.annotation.JsonSetter("tags")
    public void setTagsFromJson(com.fasterxml.jackson.databind.JsonNode node) {
        if (node == null || node.isNull()) {
            this.tags = new java.util.ArrayList<>();
        } else if (node.isArray()) {
            List<String> list = new java.util.ArrayList<>();
            node.forEach(n -> {
                if (n != null && !n.isNull() && !n.asText().isBlank()) {
                    list.add(n.asText().trim());
                }
            });
            this.tags = list;
        } else if (node.isTextual()) {
            String text = node.asText();
            if (text != null && !text.isBlank()) {
                List<String> list = new java.util.ArrayList<>();
                for (String part : text.split(",")) {
                    if (part != null) {
                        String trimmed = part.trim();
                        if (!trimmed.isEmpty()) {
                            list.add(trimmed);
                        }
                    }
                }
                this.tags = list;
            } else {
                this.tags = new java.util.ArrayList<>();
            }
        }
    }
}
