package com.testcaseiq.api.export.dto;

import java.util.List;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;

public record ApprovedTestCaseExport(
        UUID storyId,
        String storyTitle,
        String storyReference,
        UUID testSuiteId,
        String testSuiteName,
        UUID testCaseId,
        String title,
        String objective,
        TestCaseType type,
        TestLayer layer,
        Priority priority,
        RiskLevel risk,
        ReviewStatus reviewStatus,
        boolean automationCandidate,
        Double confidenceScore,
        String preconditions,
        List<ExportedTestStep> steps,
        List<ExportedTestData> testData,
        List<String> linkedRequirementReferences,
        List<String> sourceEvidence,
        String bddScenario
) {
}
