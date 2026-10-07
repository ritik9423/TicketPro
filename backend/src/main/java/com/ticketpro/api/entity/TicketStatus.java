package com.ticketpro.api.entity;

public enum TicketStatus {
    OPEN,
    IN_PROGRESS,
    ON_HOLD,
    RESOLVED,
    CLOSED,
    REOPENED;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static TicketStatus fromJson(Object input) {
        if (input == null) {
            return OPEN;
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

    public static TicketStatus fromString(String value) {
        if (value == null || value.isBlank()) {
            return OPEN;
        }
        String v = value.trim().toUpperCase().replace(" ", "_").replace("-", "_");
        for (TicketStatus s : TicketStatus.values()) {
            if (s.name().equalsIgnoreCase(v)) {
                return s;
            }
        }
        return OPEN;
    }
}
