package com.ticketpro.api.service.outpost;

import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.outpost.OutpostCheckTokenResponse;
import com.ticketpro.api.dto.outpost.OutpostTokenResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class OutpostAuthServiceTest {

    private OutpostClient outpostClient;
    private OutpostProperties outpostProperties;
    private OutpostAuthService outpostAuthService;

    @BeforeEach
    void setUp() {
        outpostClient = Mockito.mock(OutpostClient.class);
        outpostProperties = new OutpostProperties();
        outpostAuthService = new OutpostAuthService(outpostClient, outpostProperties);
    }

    @Test
    void obtainTokenForUser_whenNotConfigured_generatesDevToken() {
        outpostProperties.setClientId("");
        outpostProperties.setClientSecret("");

        String token = outpostAuthService.obtainTokenForUser("user@example.com");

        assertNotNull(token);
        assertTrue(token.startsWith("op_dev_"));
        assertEquals("user@example.com", outpostAuthService.resolveIdentityFromToken(token));
        assertTrue(outpostAuthService.isTokenValid(token));
    }

    @Test
    void obtainTokenForUser_whenConfigured_callsOutpostClient() {
        outpostProperties.setClientId("test-client-id");
        outpostProperties.setClientSecret("test-client-secret");

        OutpostTokenResponse mockResponse = OutpostTokenResponse.builder()
                .accessToken("outpost-access-token-12345")
                .tokenType("bearer")
                .expiresIn(3600L)
                .build();

        when(outpostClient.fetchToken("test-client-id", "test-client-secret")).thenReturn(mockResponse);

        String token = outpostAuthService.obtainTokenForUser("agent@ticketpro.com");

        assertNotNull(token);
        assertTrue(token.startsWith("op_usr_"));
        assertEquals("agent@ticketpro.com", outpostAuthService.resolveIdentityFromToken(token));
    }

    @Test
    void obtainTokenForUser_multipleUsers_haveDistinctSessions() {
        outpostProperties.setClientId("test-client-id");
        outpostProperties.setClientSecret("test-client-secret");

        OutpostTokenResponse mockResponse = OutpostTokenResponse.builder()
                .accessToken("shared-client-token")
                .tokenType("bearer")
                .expiresIn(3600L)
                .build();

        when(outpostClient.fetchToken("test-client-id", "test-client-secret")).thenReturn(mockResponse);

        String token1 = outpostAuthService.obtainTokenForUser("admin@ticketpro.com");
        String token2 = outpostAuthService.obtainTokenForUser("agent@ticketpro.com");

        assertNotEquals(token1, token2);
        assertEquals("admin@ticketpro.com", outpostAuthService.resolveIdentityFromToken(token1));
        assertEquals("agent@ticketpro.com", outpostAuthService.resolveIdentityFromToken(token2));
    }

    @Test
    void resolveIdentityFromToken_whenInCache_returnsUserEmailWithoutNetworkCall() {
        String testToken = "session-token-abc";
        outpostAuthService.associateUserToken(testToken, "admin@ticketpro.com", 300);

        String resolved = outpostAuthService.resolveIdentityFromToken(testToken);

        assertEquals("admin@ticketpro.com", resolved);
    }

    @Test
    void resolveIdentityFromToken_whenNotInCache_callsOutpostCheckToken() {
        outpostProperties.setClientId("ci");
        outpostProperties.setClientSecret("cs");

        String remoteToken = "remote-outpost-token-xyz";
        OutpostCheckTokenResponse checkResponse = OutpostCheckTokenResponse.builder()
                .active(true)
                .userName("remote-user@ticketpro.com")
                .clientId("ci")
                .build();

        when(outpostClient.checkToken(remoteToken)).thenReturn(checkResponse);

        String resolved = outpostAuthService.resolveIdentityFromToken(remoteToken);

        assertEquals("remote-user@ticketpro.com", resolved);
    }

    @Test
    void invalidateToken_removesTokenFromSession() {
        String token = "token-to-revoke";
        outpostAuthService.associateUserToken(token, "test@example.com", 300);
        assertTrue(outpostAuthService.isTokenValid(token));

        outpostAuthService.invalidateToken(token);

        assertNull(outpostAuthService.resolveIdentityFromToken(token));
    }

    @Test
    void introspectToken_whenInternalTokenNotActive_neverCallsOutpost() {
        outpostProperties.setClientId("ci");
        outpostProperties.setClientSecret("cs");

        String expiredInternalToken = "op_usr_dGVzdEBleGFtcGxlLmNvbQ_1234567890abcdef";

        OutpostCheckTokenResponse response = outpostAuthService.introspectToken(expiredInternalToken);

        assertNotNull(response);
        assertFalse(response.isTokenActive());
        assertEquals("EXPIRED_SESSION", response.getError());
        Mockito.verify(outpostClient, Mockito.never()).checkToken(Mockito.anyString());
    }

    @Test
    void introspectToken_whenRemoteTokenInactive_cachesNegativeResult() {
        outpostProperties.setClientId("ci");
        outpostProperties.setClientSecret("cs");

        String remoteToken = "remote-dead-token-123";
        OutpostCheckTokenResponse inactiveResponse = OutpostCheckTokenResponse.builder()
                .active(false)
                .error("PASSPORT_INACTIVE")
                .errorDescription("Passport invalid")
                .build();

        when(outpostClient.checkToken(remoteToken)).thenReturn(inactiveResponse);

        // First call triggers network check
        OutpostCheckTokenResponse resp1 = outpostAuthService.introspectToken(remoteToken);
        assertNotNull(resp1);
        assertFalse(resp1.isTokenActive());

        // Second call hits cache (negative caching) - no additional network call
        OutpostCheckTokenResponse resp2 = outpostAuthService.introspectToken(remoteToken);
        assertNotNull(resp2);
        assertFalse(resp2.isTokenActive());

        Mockito.verify(outpostClient, Mockito.times(1)).checkToken(remoteToken);
    }
}
