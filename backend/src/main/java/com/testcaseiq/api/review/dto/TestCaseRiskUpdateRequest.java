package com.testcaseiq.api.review.dto;

import com.testcaseiq.api.domain.enums.RiskLevel;

import jakarta.validation.constraints.NotNull;

public record TestCaseRiskUpdateRequest(
        @NotNull(message = "Risk level is required")
        RiskLevel riskLevel,

        String comment
) {
}
