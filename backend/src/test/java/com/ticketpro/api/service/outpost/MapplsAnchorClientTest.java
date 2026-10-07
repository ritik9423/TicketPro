package com.ticketpro.api.service.outpost;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticketpro.api.config.OutpostProperties;
import com.ticketpro.api.dto.outpost.AnchorUserRequest;
import com.ticketpro.api.dto.outpost.AnchorUserResponse;
import com.ticketpro.api.dto.outpost.OutpostTokenResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MapplsAnchorClientTest {

    private OutpostProperties outpostProperties;
    private OutpostTokenService outpostTokenService;
    private RestTemplate restTemplate;
    private MapplsAnchorClient mapplsAnchorClient;

    @BeforeEach
    void setUp() {
        outpostProperties = new OutpostProperties();
        outpostProperties.setAnchorUsersUrl("https://anchor.mappls.com/api/users/");

        outpostTokenService = mock(OutpostTokenService.class);
        restTemplate = mock(RestTemplate.class);

        RestTemplateBuilder builder = mock(RestTemplateBuilder.class);
        when(builder.setConnectTimeout(any())).thenReturn(builder);
        when(builder.setReadTimeout(any())).thenReturn(builder);
        when(builder.build()).thenReturn(restTemplate);

        mapplsAnchorClient = new MapplsAnchorClient(outpostProperties, outpostTokenService, builder, new ObjectMapper());
    }

    @Test
    void createUser_withExplicitBearerToken_success() {
        AnchorUserRequest request = AnchorUserRequest.builder()
                .name("TestUser")
                .usernamesws("testuse11r@example.com")
                .email("tesadr012@example.com")
                .password("mapplsQ1234")
                .build();

        String rawResponseJson = "{\"status\":\"success\",\"message\":\"User created successfully\",\"userId\":\"12345\"}";

        when(restTemplate.postForEntity(eq("https://anchor.mappls.com/api/users/"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(rawResponseJson, HttpStatus.OK));

        AnchorUserResponse response = mapplsAnchorClient.createUser("33b53c49-0e1e-4e82-afce-51e988ab2e43", request);

        assertNotNull(response);
        assertTrue(response.getSuccess());
        assertEquals("User successfully created on Mappls Anchor", response.getMessage());
    }

    @Test
    void createUser_withoutToken_fetchesFromTokenService() {
        AnchorUserRequest request = AnchorUserRequest.builder()
                .name("TestUser")
                .usernamesws("testuse11r@example.com")
                .email("tesadr012@example.com")
                .password("mapplsQ1234")
                .build();

        OutpostTokenResponse tokenResponse = OutpostTokenResponse.builder()
                .accessToken("mock-outpost-token")
                .build();

        when(outpostTokenService.requestToken()).thenReturn(tokenResponse);
        when(restTemplate.postForEntity(eq("https://anchor.mappls.com/api/users/"), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>("{\"status\":\"success\"}", HttpStatus.CREATED));

        AnchorUserResponse response = mapplsAnchorClient.createUser(request);

        assertNotNull(response);
        assertTrue(response.getSuccess());
        verify(outpostTokenService, times(1)).requestToken();
    }
}
