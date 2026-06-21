package com.testcaseiq.api.audit;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public record AuditEventResponse(
        UUID id,
        Instant timestamp,
        UUID actorUserId,
        String actorEmail,
        String actorRole,
        String action,
        String resourceType,
        String resourceId,
        String outcome,
        String summary,
        String requestPath,
        String requestMethod,
        String ipAddress,
        Map<String, String> metadata
) {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, String>> META_TYPE = new TypeReference<>() {};

    public static AuditEventResponse from(AuditEvent event) {
        Map<String, String> metadata = null;
        if (event.getMetadata() != null) {
            try {
                metadata = MAPPER.readValue(event.getMetadata(), META_TYPE);
            } catch (Exception ignored) {
            }
        }
        return new AuditEventResponse(
                event.getId(),
                event.getTimestamp(),
                event.getActorUserId(),
                event.getActorEmail(),
                event.getActorRole(),
                event.getAction(),
                event.getResourceType(),
                event.getResourceId(),
                event.getOutcome(),
                event.getSummary(),
                event.getRequestPath(),
                event.getRequestMethod(),
                event.getIpAddress(),
                metadata
        );
    }
}
