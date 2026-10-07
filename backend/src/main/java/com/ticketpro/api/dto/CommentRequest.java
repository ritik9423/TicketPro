package com.ticketpro.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentRequest {
    @JsonAlias({"content", "message", "text"})
    private String comment;
    
    @JsonAlias({"internal", "is_internal"})
    private boolean isInternal;

    public String getContent() {
        return this.comment;
    }

    public void setContent(String content) {
        this.comment = content;
    }
}
