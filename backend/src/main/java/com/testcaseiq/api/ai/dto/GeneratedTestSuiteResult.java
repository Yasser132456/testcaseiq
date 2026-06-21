package com.testcaseiq.api.ai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record GeneratedTestSuiteResult(
        UUID id,
        UUID storyId,
        String suiteName,
        List<GeneratedTestCaseDto> testCases,
        QaValidationResult qaValidation,
        String provider,
        Instant generatedAt,
        String explainabilitySummary
) {
    public GeneratedTestSuiteResult(
            UUID storyId,
            String suiteName,
            List<GeneratedTestCaseDto> testCases,
            QaValidationResult qaValidation,
            String provider,
            Instant generatedAt
    ) {
        this(null, storyId, suiteName, testCases, qaValidation, provider, generatedAt, null);
    }
}
