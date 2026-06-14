package com.testcaseiq.api.ai.dto;

import java.util.List;
import java.util.UUID;

public record TestGenerationRequest(
        UUID storyId,
        String title,
        String rawText,
        List<ExtractedRequirementDto> requirements
) {
}
