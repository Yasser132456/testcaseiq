package com.testcaseiq.api.ai.dto;

import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.RiskLevel;

public record ExtractedRequirementDto(
        String reference,
        String title,
        String description,
        RequirementType type,
        Priority priority,
        RiskLevel riskLevel
) {
}
