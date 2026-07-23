package com.testcaseiq.api.story.dto;

import java.util.List;

import com.testcaseiq.api.domain.enums.RiskLevel;

public record RequirementCoverage(
        String reference,
        String title,
        RiskLevel riskLevel,
        List<CaseRef> linkedCases,
        boolean covered
) {
}
