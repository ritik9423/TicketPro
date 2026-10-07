package com.ticketpro.api.controller.outpost;

import com.ticketpro.api.dto.outpost.AnchorUserRequest;
import com.ticketpro.api.dto.outpost.AnchorUserResponse;
import com.ticketpro.api.service.outpost.MapplsAnchorClient;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller exposing Mappls Anchor User Creation API:
 * POST /api/anchor/users
 * Matches:
 * curl --location 'https://anchor.mappls.com/api/users/' \
 * --header 'authorization: bearer 33b53c49-0e1e-4e82-afce-51e988ab2e43' \
 * --header 'content-type: application/json' \
 * --data-raw '{"name":"TestUser","usernamesws":"testuse11r@example.com","email":"tesadr012@example.com","password":"mapplsQ1234"}'
 */
@RestController
@RequestMapping("/api/anchor")
@RequiredArgsConstructor
@Slf4j
public class AnchorUserController {

    private final MapplsAnchorClient anchorClient;

    /**
     * Create / provision a user on Mappls Anchor.
     *
     * If the Authorization header is provided, it uses the provided Bearer token.
     * If Authorization header is omitted, it automatically obtains a fresh token from Outpost.
     */
    @PostMapping("/users")
    public ResponseEntity<AnchorUserResponse> createUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody AnchorUserRequest request) {

        log.info("Received request to create user on Mappls Anchor for: {}", request.getEmail());
        AnchorUserResponse response;
        if (authHeader != null && !authHeader.isBlank()) {
            response = anchorClient.createUser(authHeader, request);
        } else {
            response = anchorClient.createUser(request);
        }

        if (Boolean.TRUE.equals(response.getSuccess())) {
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(response);
        }
    }
}
