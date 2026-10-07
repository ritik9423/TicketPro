package com.ticketpro.api.security;

import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StompChannelInterceptorTest {

    @Mock
    private JwtDecoder jwtDecoder;

    @Mock
    private OutpostJwtAuthenticationConverter authenticationConverter;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private MessageChannel messageChannel;

    @InjectMocks
    private StompChannelInterceptor interceptor;

    private User testUser;
    private CustomUserDetails customUserDetails;
    private OutpostJwtAuthenticationToken authPrincipal;

    @BeforeEach
    void setUp() {
        Company company = new Company();
        company.setId(1L);
        company.setCompanyCode("ACME");

        testUser = new User();
        testUser.setId(10L);
        testUser.setEmail("user@acme.com");
        testUser.setRole(Role.COMPANY_ADMIN);
        testUser.setCompany(company);

        customUserDetails = new CustomUserDetails(testUser);
        Jwt jwt = new Jwt("token123", Instant.now(), Instant.now().plusSeconds(3600), Map.of("alg", "none"), Map.of("sub", "user@acme.com"));
        authPrincipal = new OutpostJwtAuthenticationToken(jwt, customUserDetails, customUserDetails.getAuthorities());
    }

    @Test
    @DisplayName("CONNECT rejects unauthenticated session without token")
    void testConnect_RejectsUnauthenticated() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("CONNECT accepts valid JWT token and populates session user")
    void testConnect_AcceptsValidJwt() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.addNativeHeader("Authorization", "Bearer valid.jwt.token");
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Jwt mockJwt = new Jwt("valid.jwt.token", Instant.now(), Instant.now().plusSeconds(3600), Map.of("alg", "none"), Map.of("sub", "user@acme.com"));
        when(jwtDecoder.decode("valid.jwt.token")).thenReturn(mockJwt);
        when(authenticationConverter.convert(mockJwt)).thenReturn(authPrincipal);

        Message<?> result = interceptor.preSend(message, messageChannel);
        assertNotNull(result);
    }

    @Test
    @DisplayName("SUBSCRIBE allows valid tenant-scoped topic")
    void testSubscribe_ValidTenantTopicAllowed() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tickets/ACME");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertDoesNotThrow(() -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE rejects cross-tenant topic")
    void testSubscribe_CrossTenantTopicRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tickets/BETA");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE allows ticket topic matching user's company")
    void testSubscribe_MatchingTicketAllowed() {
        Ticket ticket = new Ticket();
        ticket.setId(100L);
        ticket.setCompany(testUser.getCompany());

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tickets/100");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertDoesNotThrow(() -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE rejects ticket topic from another tenant")
    void testSubscribe_CrossTenantTicketRejected() {
        Company otherCompany = new Company();
        otherCompany.setId(99L);
        otherCompany.setCompanyCode("OTHER");

        Ticket otherTicket = new Ticket();
        otherTicket.setId(200L);
        otherTicket.setCompany(otherCompany);

        when(ticketRepository.findById(200L)).thenReturn(Optional.of(otherTicket));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tickets/200");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE allows user's own notifications destination")
    void testSubscribe_OwnNotificationsAllowed() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications/10");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertDoesNotThrow(() -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE rejects other user's notifications destination")
    void testSubscribe_OtherUserNotificationsRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications/99");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SEND rejects unauthorized publication to server broadcast topics")
    void testSend_UnauthorizedTopicSendRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination("/topic/tickets/ACME");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE allows valid tenant-scoped deleted topic")
    void testSubscribe_ValidTenantDeletedTopicAllowed() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tickets/ACME/deleted");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertDoesNotThrow(() -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE rejects cross-tenant deleted topic")
    void testSubscribe_CrossTenantDeletedTopicRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tickets/BETA/deleted");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE allows ticket comments topic for matching company")
    void testSubscribe_MatchingTicketCommentsAllowed() {
        Ticket ticket = new Ticket();
        ticket.setId(100L);
        ticket.setCompany(testUser.getCompany());

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tickets/100/comments");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertDoesNotThrow(() -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE allows tenant admin notification topic for COMPANY_ADMIN")
    void testSubscribe_ValidTenantAdminNotificationAllowed() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications/ACME/admin");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertDoesNotThrow(() -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE rejects tenant admin notification topic for non-admin user")
    void testSubscribe_NonAdminRoleAdminNotificationRejected() {
        testUser.setRole(Role.AGENT);
        CustomUserDetails agentDetails = new CustomUserDetails(testUser);
        Jwt jwt = new Jwt("tokenAgent", Instant.now(), Instant.now().plusSeconds(3600), Map.of("alg", "none"), Map.of("sub", "user@acme.com"));
        OutpostJwtAuthenticationToken agentPrincipal = new OutpostJwtAuthenticationToken(jwt, agentDetails, agentDetails.getAuthorities());

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications/ACME/admin");
        accessor.setUser(agentPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE allows tenant agent notification topic for agent/admin")
    void testSubscribe_ValidTenantAgentNotificationAllowed() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications/ACME/agent");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertDoesNotThrow(() -> {
            interceptor.preSend(message, messageChannel);
        });
    }

    @Test
    @DisplayName("SUBSCRIBE rejects cross-tenant admin notification topic")
    void testSubscribe_CrossTenantAdminNotificationRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications/OTHER/admin");
        accessor.setUser(authPrincipal);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () -> {
            interceptor.preSend(message, messageChannel);
        });
    }
}
