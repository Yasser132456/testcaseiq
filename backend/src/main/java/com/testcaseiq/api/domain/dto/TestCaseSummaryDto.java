package com.testcaseiq.api.domain.dto;

import java.time.Instant;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.TestCaseType;

public record TestCaseSummaryDto(
        UUID id,
        UUID testSuiteId,
        String title,
        TestCaseType type,
        Priority priority,
        ReviewStatus reviewStatus,
        Instant updatedAt
) {
}
