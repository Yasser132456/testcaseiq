package com.testcaseiq.api.ai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record GeneratedTestSuiteResult(
        UUID storyId,
        String suiteName,
        List<GeneratedTestCaseDto> testCases,
        QaValidationResult qaValidation,
        String provider,
        Instant generatedAt
) {
}
