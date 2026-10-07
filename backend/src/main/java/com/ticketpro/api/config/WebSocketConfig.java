package com.ticketpro.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${ticketpro.cors.allowed-origins:http://localhost:*,http://127.0.0.1:*}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        List<String> origins = new ArrayList<>();
        if (allowedOrigins != null && !allowedOrigins.trim().isEmpty()) {
            origins.addAll(Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList()));
        }

        // Always ensure localhost & local dev origins are present for WebSocket handshakes
        if (!origins.contains("http://localhost:*")) origins.add("http://localhost:*");
        if (!origins.contains("http://127.0.0.1:*")) origins.add("http://127.0.0.1:*");
        if (!origins.contains("http://localhost:5173")) origins.add("http://localhost:5173");
        if (!origins.contains("http://localhost:5174")) origins.add("http://localhost:5174");
        if (!origins.contains("http://localhost:5175")) origins.add("http://localhost:5175");
        if (!origins.contains("http://localhost:3000")) origins.add("http://localhost:3000");

        String[] originPatterns = origins.toArray(new String[0]);

        // Native STOMP WebSocket endpoints (both /ws and /ws/websocket)
        registry.addEndpoint("/ws", "/ws/websocket")
                .setAllowedOriginPatterns(originPatterns);

        // SockJS fallback endpoint
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(originPatterns)
                .withSockJS();
    }

    private final com.ticketpro.api.security.StompChannelInterceptor stompChannelInterceptor;

    public WebSocketConfig(com.ticketpro.api.security.StompChannelInterceptor stompChannelInterceptor) {
        this.stompChannelInterceptor = stompChannelInterceptor;
    }

    @Override
    public void configureClientInboundChannel(@NonNull org.springframework.messaging.simp.config.ChannelRegistration registration) {
        registration.interceptors(stompChannelInterceptor);
    }
}
