package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CommentRequest;
import com.ticketpro.api.entity.Comment;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.ticketpro.api.dto.CommentResponse;
import com.ticketpro.api.dto.PagedResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;


@RestController
@RequestMapping("/api/tickets/{ticketId}/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping
    public ResponseEntity<?> getComments(
            @PathVariable("ticketId") Long ticketId,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            Pageable pageable) {
        // SECURITY C-3: Reject unauthenticated requests instead of defaulting to SUPER_ADMIN
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long companyId = userDetails.getCompanyId();
        Role role = userDetails.getRole();
        Long userId = userDetails.getId();

        int pageNum = page != null ? page : 0;
        int pageSize = Math.min(size != null ? size : 20, 100);
        Pageable paged = PageRequest.of(pageNum, pageSize, pageable.getSort());
        Page<Comment> commentPage = commentService.getCommentsForTicketPaged(ticketId, companyId, role, userId, paged);
        return ResponseEntity.ok(PagedResponse.from(commentPage, CommentResponse::from));
    }

    @PostMapping
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable("ticketId") Long ticketId,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        // SECURITY C-3: Reject unauthenticated requests instead of defaulting to SUPER_ADMIN
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long companyId = userDetails.getCompanyId();
        Role role = userDetails.getRole();
        User user = userDetails.getUser();
        Comment comment = commentService.addComment(ticketId, request, companyId, role, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(CommentResponse.from(comment));
    }
}
