package com.ticketpro.api.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum Role {
    SUPER_ADMIN,
    COMPANY_ADMIN,
    MANAGER,
    AGENT,
    END_USER;

    @JsonCreator
    public static Role fromJson(Object input) {
        if (input == null) {
            return END_USER;
        }
        if (input instanceof java.util.Map<?, ?> map) {
            Object target = map.get("target");
            if (target instanceof java.util.Map<?, ?> targetMap && targetMap.get("value") != null) {
                return fromString(targetMap.get("value").toString());
            }
            if (map.get("value") != null) {
                return fromString(map.get("value").toString());
            }
        }
        return fromString(input.toString());
    }

    public static Role fromString(String value) {
        if (value == null || value.isBlank()) {
            return END_USER;
        }
        String v = value.trim().toUpperCase();
        if ("USER".equals(v) || "CUSTOMER".equals(v) || "CLIENT".equals(v) || "ENDUSER".equals(v) || "END_USER".equals(v)) {
            return END_USER;
        }
        for (Role r : Role.values()) {
            if (r.name().equalsIgnoreCase(v)) {
                return r;
            }
        }
        return END_USER;
    }
}
