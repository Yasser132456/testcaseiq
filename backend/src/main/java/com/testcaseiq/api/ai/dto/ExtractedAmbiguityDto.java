package com.testcaseiq.api.ai.dto;

import com.testcaseiq.api.domain.enums.AmbiguitySeverity;

public record ExtractedAmbiguityDto(
        String question,
        String context,
        AmbiguitySeverity severity
) {
}
