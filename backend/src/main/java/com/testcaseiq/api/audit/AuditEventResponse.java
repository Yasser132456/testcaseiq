package com.testcaseiq.api.audit;

import java.time.Instant;
import java.util.UUID;

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
        String ipAddress
) {

    public static AuditEventResponse from(AuditEvent event) {
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
                event.getIpAddress()
        );
    }
}
