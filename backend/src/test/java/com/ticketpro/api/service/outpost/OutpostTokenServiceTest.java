package com.ticketpro.api.service.outpost;

import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.outpost.OutpostTokenResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OutpostTokenServiceTest {

    private OutpostProperties outpostProperties;
    private RestTemplate restTemplate;
    private OutpostTokenService outpostTokenService;

    @BeforeEach
    void setUp() {
        outpostProperties = new OutpostProperties();
        outpostProperties.setClientId("test-client-id");
        outpostProperties.setClientSecret("test-client-secret");
        outpostProperties.setTokenUrl("https://outpost.mappls.com/api/security/oauth/token");

        restTemplate = mock(RestTemplate.class);
        RestTemplateBuilder builder = mock(RestTemplateBuilder.class);
        when(builder.setConnectTimeout(any())).thenReturn(builder);
        when(builder.setReadTimeout(any())).thenReturn(builder);
        when(builder.build()).thenReturn(restTemplate);

        outpostTokenService = new OutpostTokenService(outpostProperties, builder);
    }

    @Test
    void requestToken_whenConfigured_returnsAccessToken() {
        OutpostTokenResponse mockResponse = OutpostTokenResponse.builder()
                .accessToken("mock-outpost-jwt-token")
                .tokenType("bearer")
                .expiresIn(3600L)
                .scope("read write")
                .build();

        when(restTemplate.postForEntity(any(URI.class), any(HttpEntity.class), eq(OutpostTokenResponse.class)))
                .thenReturn(new ResponseEntity<>(mockResponse, HttpStatus.OK));

        OutpostTokenResponse response = outpostTokenService.requestToken();

        assertNotNull(response);
        assertEquals("mock-outpost-jwt-token", response.getAccessToken());
        assertEquals(3600L, response.getExpiresIn());
    }

    @Test
    void requestToken_whenNotConfigured_throwsIllegalStateException() {
        outpostProperties.setClientId("");
        outpostProperties.setClientSecret("");

        assertThrows(IllegalStateException.class, () -> outpostTokenService.requestToken());
    }
}
