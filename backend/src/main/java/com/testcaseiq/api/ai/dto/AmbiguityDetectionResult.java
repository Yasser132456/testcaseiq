package com.testcaseiq.api.ai.dto;

import java.util.List;

public record AmbiguityDetectionResult(
        List<ExtractedAmbiguityDto> ambiguities
) {
}
