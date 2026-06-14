package com.testcaseiq.api.ai.dto;

import com.testcaseiq.api.domain.enums.CoverageCategory;
import com.testcaseiq.api.domain.enums.RiskLevel;

public record CoverageItemDto(
        String requirementReference,
        CoverageCategory category,
        String description,
        RiskLevel riskLevel
) {
}
