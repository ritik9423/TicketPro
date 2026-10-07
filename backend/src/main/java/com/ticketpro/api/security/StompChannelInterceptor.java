package com.ticketpro.api.security;

import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.repository.TicketRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Optional;

@Component
@Slf4j
public class StompChannelInterceptor implements ChannelInterceptor {

    private final JwtDecoder jwtDecoder;
    private final OutpostJwtAuthenticationConverter authenticationConverter;
    private final TicketRepository ticketRepository;

    public StompChannelInterceptor(JwtDecoder jwtDecoder,
                                   OutpostJwtAuthenticationConverter authenticationConverter,
                                   TicketRepository ticketRepository) {
        this.jwtDecoder = jwtDecoder;
        this.authenticationConverter = authenticationConverter;
        this.ticketRepository = ticketRepository;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            handleConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            handleSubscribe(accessor);
        } else if (StompCommand.SEND.equals(command)) {
            handleSend(accessor);
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || authHeader.isBlank()) {
            authHeader = accessor.getFirstNativeHeader("token");
        }

        if (authHeader == null || authHeader.isBlank()) {
            log.warn("STOMP CONNECT rejected: missing Authorization/token header");
            throw new AccessDeniedException("Authentication required: missing token header in STOMP CONNECT frame.");
        }

        String rawToken = authHeader.trim();
        if (rawToken.toLowerCase().startsWith("bearer ")) {
            rawToken = rawToken.substring(7).trim();
        }

        try {
            Jwt jwt = jwtDecoder.decode(rawToken);
            Authentication auth = authenticationConverter.convert(jwt);
            if (auth == null || !auth.isAuthenticated()) {
                throw new AccessDeniedException("Invalid WebSocket authentication credentials.");
            }
            if (accessor.isMutable()) {
                accessor.setUser(auth);
            }
            log.info("STOMP connection authenticated successfully for principal: {}", auth.getName());
        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (Exception e) {
            log.warn("STOMP authentication failed: {}", e.getMessage());
            throw new AccessDeniedException("Authentication failed for STOMP session: " + e.getMessage());
        }
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        Principal principal = accessor.getUser();
        if (principal == null) {
            log.warn("STOMP SUBSCRIBE rejected: missing principal for destination: {}", accessor.getDestination());
            throw new AccessDeniedException("Unauthenticated STOMP subscription attempt.");
        }

        CustomUserDetails userDetails = extractUserDetails(principal);
        if (userDetails == null) {
            log.warn("STOMP SUBSCRIBE rejected: unrecognized principal for destination: {}", accessor.getDestination());
            throw new AccessDeniedException("Unrecognized principal in STOMP subscription.");
        }

        String destination = accessor.getDestination();
        if (destination == null || destination.isBlank()) {
            return;
        }

        // SUPER_ADMIN can subscribe to any topic
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            return;
        }

        String userCompCode = userDetails.getCompanyCode() != null ? userDetails.getCompanyCode().toUpperCase() : "";

        // 1. Tenant-scoped ticket topics: /topic/tickets/{companyCode}
        if (destination.startsWith("/topic/tickets/")) {
            String suffix = destination.substring("/topic/tickets/".length());
            if (suffix.matches("^\\d+$")) {
                // Ticket-specific topic: /topic/tickets/{ticketId}
                Long ticketId = Long.parseLong(suffix);
                Optional<Ticket> ticketOpt = ticketRepository.findById(ticketId);
                if (ticketOpt.isEmpty()) {
                    log.warn("User {} tried to subscribe to non-existent ticket: {}", userDetails.getUsername(), ticketId);
                    throw new AccessDeniedException("Cannot subscribe to non-existent ticket: " + ticketId);
                }
                Ticket ticket = ticketOpt.get();
                if (ticket.getCompany() == null || !ticket.getCompany().getId().equals(userDetails.getCompanyId())) {
                    log.warn("Cross-tenant ticket topic subscription attempt by user {} on ticket {}", userDetails.getUsername(), ticketId);
                    throw new AccessDeniedException("Access denied: ticket belongs to another tenant.");
                }
                if (userDetails.getRole() == Role.END_USER) {
                    if (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(userDetails.getId())) {
                        log.warn("End-user {} tried to subscribe to ticket {} not created by them", userDetails.getUsername(), ticketId);
                        throw new AccessDeniedException("Access denied: end-users can only subscribe to their own tickets.");
                    }
                }
            } else if (suffix.matches("^\\d+/comments$")) {
                // Ticket comments topic: /topic/tickets/{ticketId}/comments
                Long ticketId = Long.parseLong(suffix.substring(0, suffix.indexOf('/')));
                Optional<Ticket> ticketOpt = ticketRepository.findById(ticketId);
                if (ticketOpt.isEmpty()) {
                    log.warn("User {} tried to subscribe to non-existent ticket comments: {}", userDetails.getUsername(), ticketId);
                    throw new AccessDeniedException("Cannot subscribe to non-existent ticket: " + ticketId);
                }
                Ticket ticket = ticketOpt.get();
                if (ticket.getCompany() == null || !ticket.getCompany().getId().equals(userDetails.getCompanyId())) {
                    log.warn("Cross-tenant ticket comment topic subscription attempt by user {} on ticket {}", userDetails.getUsername(), ticketId);
                    throw new AccessDeniedException("Access denied: ticket belongs to another tenant.");
                }
                if (userDetails.getRole() == Role.END_USER) {
                    if (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(userDetails.getId())) {
                        log.warn("End-user {} tried to subscribe to comments of ticket {} not created by them", userDetails.getUsername(), ticketId);
                        throw new AccessDeniedException("Access denied: end-users can only subscribe to their own tickets.");
                    }
                }
            } else {
                // Company code topic: /topic/tickets/{COMPANY_CODE} or /topic/tickets/{COMPANY_CODE}/deleted
                String companyCode = suffix.endsWith("/deleted")
                        ? suffix.substring(0, suffix.length() - "/deleted".length())
                        : suffix;

                if (companyCode.equalsIgnoreCase("GLOBAL") || !companyCode.equalsIgnoreCase(userCompCode)) {
                    log.warn("Unauthorized ticket topic subscription: user tenant '{}' tried to subscribe to '{}'", userCompCode, suffix);
                    throw new AccessDeniedException("Access denied: cannot subscribe to cross-tenant or global ticket topics.");
                }
            }
        }

        // 2. Tenant & User notifications: /topic/notifications/{companyCode}, /topic/notifications/{companyCode}/admin, /topic/notifications/{companyCode}/agent, or /topic/notifications/{userId}
        else if (destination.startsWith("/topic/notifications/user/")) {
            String targetEmail = destination.substring("/topic/notifications/user/".length()).trim();
            if (!targetEmail.equalsIgnoreCase(userDetails.getEmail())) {
                log.warn("User {} tried to subscribe to notification topic of {}", userDetails.getEmail(), targetEmail);
                throw new AccessDeniedException("Access denied: cannot subscribe to another user's notifications.");
            }
        } else if (destination.startsWith("/topic/notifications/")) {
            String target = destination.substring("/topic/notifications/".length()).trim();
            if (target.matches("^\\d+$")) {
                Long targetUserId = Long.parseLong(target);
                if (userDetails.getId() == null || !userDetails.getId().equals(targetUserId)) {
                    log.warn("User {} tried to subscribe to notification topic of user id {}", userDetails.getId(), targetUserId);
                    throw new AccessDeniedException("Access denied: cannot subscribe to another user's notifications.");
                }
            } else {
                String companyCode = target;
                boolean isAdminSub = false;
                boolean isAgentSub = false;

                if (target.toLowerCase().endsWith("/admin")) {
                    companyCode = target.substring(0, target.length() - "/admin".length());
                    isAdminSub = true;
                } else if (target.toLowerCase().endsWith("/agent")) {
                    companyCode = target.substring(0, target.length() - "/agent".length());
                    isAgentSub = true;
                }

                if (companyCode.equalsIgnoreCase("GLOBAL") || !companyCode.equalsIgnoreCase(userCompCode)) {
                    log.warn("Unauthorized notification topic subscription: user tenant '{}' (role {}) tried to subscribe to '{}'", userCompCode, userDetails.getRole(), target);
                    throw new AccessDeniedException("Access denied: cross-tenant notification subscription.");
                }

                Role role = userDetails.getRole();
                if (isAdminSub && role != Role.COMPANY_ADMIN) {
                    log.warn("User {} with role {} tried to subscribe to admin notification topic '{}'", userDetails.getUsername(), role, target);
                    throw new AccessDeniedException("Access denied: only COMPANY_ADMIN can subscribe to admin notifications.");
                }
                if (isAgentSub && role != Role.AGENT && role != Role.MANAGER && role != Role.COMPANY_ADMIN) {
                    log.warn("User {} with role {} tried to subscribe to agent notification topic '{}'", userDetails.getUsername(), role, target);
                    throw new AccessDeniedException("Access denied: only agents, managers, or company admins can subscribe to agent notifications.");
                }
            }
        }

        // 3. Feedback topic: /topic/feedback/{companyCode}
        else if (destination.startsWith("/topic/feedback/")) {
            String targetComp = destination.substring("/topic/feedback/".length()).trim();
            if (!targetComp.equalsIgnoreCase(userCompCode)) {
                throw new AccessDeniedException("Access denied: cross-tenant feedback subscription.");
            }
        }
    }

    private void handleSend(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination != null && (destination.startsWith("/topic/") || destination.startsWith("/queue/"))) {
            log.warn("Client attempted direct SEND to broker topic: {}", destination);
            throw new AccessDeniedException("Clients are not permitted to publish directly to broker topics.");
        }
    }

    private CustomUserDetails extractUserDetails(Principal principal) {
        if (principal instanceof Authentication auth) {
            Object p = auth.getPrincipal();
            if (p instanceof CustomUserDetails cud) {
                return cud;
            }
        }
        return null;
    }
}
