package com.testcaseiq.api.story.dto;

import com.testcaseiq.api.domain.enums.RiskLevel;

public record CoverageGap(
        String key,
        String description,
        RiskLevel riskLevel,
        String kind
) {
}
