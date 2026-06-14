package com.testcaseiq.api.ai.dto;

import java.util.List;

public record QaValidationResult(
        double requirementQualityScore,
        double testabilityScore,
        List<String> warnings
) {
}
