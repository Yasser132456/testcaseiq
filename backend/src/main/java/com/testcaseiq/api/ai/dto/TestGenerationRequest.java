package com.testcaseiq.api.ai.dto;

import java.util.List;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.FocusArea;

public record TestGenerationRequest(
        UUID storyId,
        String title,
        String rawText,
        List<ExtractedRequirementDto> requirements,
        List<ResolvedClarification> clarifications,
        String guidance,
        List<FocusArea> focusAreas
) {
    public TestGenerationRequest {
        requirements = requirements == null ? List.of() : List.copyOf(requirements);
        clarifications = clarifications == null ? List.of() : List.copyOf(clarifications);
        focusAreas = focusAreas == null ? List.of() : List.copyOf(focusAreas);
    }

    public TestGenerationRequest(
            UUID storyId,
            String title,
            String rawText,
            List<ExtractedRequirementDto> requirements
    ) {
        this(storyId, title, rawText, requirements, List.of(), null, List.of());
    }
}
