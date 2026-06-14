package com.testcaseiq.api.ai.dto;

import java.util.List;

public record RequirementExtractionResult(
        List<ExtractedRequirementDto> requirements,
        List<String> acceptanceCriteria
) {
}
