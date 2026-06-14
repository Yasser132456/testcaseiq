package com.testcaseiq.api.review.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;

public record TestCaseResponse(
        UUID id,
        UUID testSuiteId,
        String title,
        String objective,
        TestCaseType type,
        TestLayer testLayer,
        Priority priority,
        RiskLevel riskLevel,
        ReviewStatus reviewStatus,
        boolean automationCandidate,
        String preconditions,
        String bddScenario,
        List<String> linkedRequirementReferences,
        List<TestStepResponse> steps,
        Instant createdAt,
        Instant updatedAt
) {
}
