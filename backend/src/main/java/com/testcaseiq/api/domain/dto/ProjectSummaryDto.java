package com.testcaseiq.api.domain.dto;

import java.time.Instant;
import java.util.UUID;

public record ProjectSummaryDto(
        UUID id,
        String name,
        String key,
        Instant createdAt
) {
}
