package com.ticketpro.api.dto;

import lombok.NoArgsConstructor;

@NoArgsConstructor
public class CreateCommentRequest extends CommentRequest {
    public CreateCommentRequest(String comment, boolean isInternal) {
        super(comment, isInternal);
    }
}
