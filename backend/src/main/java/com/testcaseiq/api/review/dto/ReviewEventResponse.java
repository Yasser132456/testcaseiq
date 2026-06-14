package com.testcaseiq.api.review.dto;

import java.time.Instant;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.ReviewStatus;

public record ReviewEventResponse(
        UUID id,
        UUID testCaseId,
        ReviewStatus status,
        String actionType,
        String previousValue,
        String newValue,
        String reviewer,
        String comment,
        Instant createdAt
) {
}
