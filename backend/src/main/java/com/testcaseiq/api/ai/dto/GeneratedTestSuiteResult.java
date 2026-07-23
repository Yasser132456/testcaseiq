package com.testcaseiq.api.ai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.FocusArea;

public record GeneratedTestSuiteResult(
        UUID id,
        UUID storyId,
        String suiteName,
        String description,
        List<FocusArea> focusAreas,
        List<GeneratedTestCaseDto> testCases,
        QaValidationResult qaValidation,
        String provider,
        Instant generatedAt,
        String explainabilitySummary
) {
    public GeneratedTestSuiteResult {
        focusAreas = focusAreas == null ? List.of() : List.copyOf(focusAreas);
    }

    public GeneratedTestSuiteResult(
            UUID id,
            UUID storyId,
            String suiteName,
            List<GeneratedTestCaseDto> testCases,
            QaValidationResult qaValidation,
            String provider,
            Instant generatedAt,
            String explainabilitySummary
    ) {
        this(id, storyId, suiteName, null, List.of(), testCases, qaValidation, provider, generatedAt, explainabilitySummary);
    }

    public GeneratedTestSuiteResult(
            UUID storyId,
            String suiteName,
            List<GeneratedTestCaseDto> testCases,
            QaValidationResult qaValidation,
            String provider,
            Instant generatedAt
    ) {
        this(null, storyId, suiteName, null, List.of(), testCases, qaValidation, provider, generatedAt, null);
    }

    public GeneratedTestSuiteResult(
            UUID storyId,
            String suiteName,
            String description,
            List<FocusArea> focusAreas,
            List<GeneratedTestCaseDto> testCases,
            QaValidationResult qaValidation,
            String provider,
            Instant generatedAt
    ) {
        this(null, storyId, suiteName, description, focusAreas, testCases, qaValidation, provider, generatedAt, null);
    }
}
