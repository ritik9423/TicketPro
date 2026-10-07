package com.ticketpro.api.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum CompanyStatus {
    PENDING,
    ACTIVE,
    SUSPENDED,
    REJECTED;

    @JsonCreator
    public static CompanyStatus fromJson(Object input) {
        if (input == null) {
            return ACTIVE;
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

    public static CompanyStatus fromString(String value) {
        if (value == null || value.isBlank()) {
            return ACTIVE;
        }
        String v = value.trim().toUpperCase();
        for (CompanyStatus s : CompanyStatus.values()) {
            if (s.name().equalsIgnoreCase(v)) {
                return s;
            }
        }
        return ACTIVE;
    }
}
