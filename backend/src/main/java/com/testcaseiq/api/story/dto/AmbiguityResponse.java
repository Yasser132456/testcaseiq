package com.testcaseiq.api.story.dto;

import java.time.Instant;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.AmbiguityResolutionStatus;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;

public record AmbiguityResponse(
        UUID id,
        String question,
        String context,
        AmbiguitySeverity severity,
        AmbiguityResolutionStatus status,
        String resolutionNotes,
        String resolvedBy,
        Instant resolvedAt
) {
}
