package com.testcaseiq.api.settings;

public record AppSettingsUpdateRequest(
        String activeProvider,
        String generationMode,
        Integer maxTestCasesPerStory,
        Boolean enableExplainability,
        Boolean enableQualityScoring,
        Boolean requireReviewBeforeExport,
        Boolean enforceAcceptanceCriteriaMapping
) {
}
