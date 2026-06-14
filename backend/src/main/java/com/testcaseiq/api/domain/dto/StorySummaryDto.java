package com.testcaseiq.api.domain.dto;

import java.time.Instant;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;

public record StorySummaryDto(
        UUID id,
        UUID projectId,
        String title,
        StoryType type,
        StoryStatus status,
        Instant updatedAt
) {
}
