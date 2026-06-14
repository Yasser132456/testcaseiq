package com.testcaseiq.api.story;

import java.time.Instant;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;

public record StoryResponse(
        UUID id,
        UUID projectId,
        String title,
        String rawText,
        StoryType type,
        StoryStatus status,
        String externalReference,
        String metadataJson,
        Instant createdAt,
        Instant updatedAt
) {
}
