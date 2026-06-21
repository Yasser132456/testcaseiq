package com.testcaseiq.api.testsuite.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.testcaseiq.api.domain.model.TestCase;

public record TestSuiteDetailResponse(
        UUID id,
        UUID storyId,
        String storyTitle,
        UUID projectId,
        String projectName,
        String name,
        String description,
        String testLayer,
        int totalCases,
        int approvedCases,
        int rejectedCases,
        List<TestCaseSummary> testCases,
        Instant createdAt,
        Instant updatedAt,
        String explainabilitySummary
) {
    public record TestCaseSummary(
            UUID id,
            String title,
            String type,
            String priority,
            String reviewStatus,
            boolean automationCandidate,
            Integer qualityScore,
            String confidenceLevel
    ) {
        public static TestCaseSummary from(TestCase tc) {
            return new TestCaseSummary(
                    tc.getId(),
                    tc.getTitle(),
                    tc.getType() != null ? tc.getType().name() : null,
                    tc.getPriority() != null ? tc.getPriority().name() : null,
                    tc.getReviewStatus() != null ? tc.getReviewStatus().name() : null,
                    tc.isAutomationCandidate(),
                    tc.getQualityScore(),
                    tc.getConfidenceLevel() != null ? tc.getConfidenceLevel().name() : null
            );
        }
    }
}
