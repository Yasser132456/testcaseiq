package com.testcaseiq.api.settings;

public record AppSettingsDto(
        String activeProvider,
        String generationMode,
        int maxTestCasesPerStory,
        boolean enableExplainability,
        boolean enableQualityScoring,
        boolean requireReviewBeforeExport,
        boolean enforceAcceptanceCriteriaMapping,
        boolean enforceAuth
) {
}
