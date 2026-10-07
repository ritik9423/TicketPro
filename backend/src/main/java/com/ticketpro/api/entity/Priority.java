package com.ticketpro.api.entity;

public enum Priority {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static Priority fromJson(Object input) {
        if (input == null) {
            return MEDIUM;
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

    public static Priority fromString(String value) {
        if (value == null || value.isBlank()) {
            return MEDIUM;
        }
        String v = value.trim().toUpperCase();
        if ("URGENT".equals(v) || "EMERGENCY".equals(v)) {
            return CRITICAL;
        }
        for (Priority p : Priority.values()) {
            if (p.name().equalsIgnoreCase(v)) {
                return p;
            }
        }
        return MEDIUM;
    }
}
