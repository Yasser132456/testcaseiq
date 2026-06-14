package com.testcaseiq.api.ai.dto;

import java.util.List;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;

public record GeneratedTestCaseDto(
        UUID id,
        String title,
        String description,
        TestCaseType type,
        TestLayer testLayer,
        Priority priority,
        RiskLevel riskLevel,
        ReviewStatus reviewStatus,
        boolean automationCandidate,
        double confidenceScore,
        String bddScenario,
        List<String> linkedRequirementReferences,
        List<GeneratedTestStepDto> steps,
        List<GeneratedTestDataDto> testData
) {
    public GeneratedTestCaseDto(
            String title,
            String description,
            TestCaseType type,
            TestLayer testLayer,
            Priority priority,
            RiskLevel riskLevel,
            boolean automationCandidate,
            double confidenceScore,
            String bddScenario,
            List<String> linkedRequirementReferences,
            List<GeneratedTestStepDto> steps,
            List<GeneratedTestDataDto> testData
    ) {
        this(
                null,
                title,
                description,
                type,
                testLayer,
                priority,
                riskLevel,
                null,
                automationCandidate,
                confidenceScore,
                bddScenario,
                linkedRequirementReferences,
                steps,
                testData
        );
    }
}
