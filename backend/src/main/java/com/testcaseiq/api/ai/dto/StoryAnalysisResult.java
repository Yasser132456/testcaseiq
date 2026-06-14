package com.testcaseiq.api.ai.dto;

import java.time.Instant;
import java.util.UUID;

public record StoryAnalysisResult(
        UUID storyId,
        String actor,
        String goal,
        RequirementExtractionResult requirements,
        AmbiguityDetectionResult ambiguities,
        CoveragePlanResult coveragePlan,
        QaValidationResult qaValidation,
        String provider,
        Instant generatedAt
) {
}
