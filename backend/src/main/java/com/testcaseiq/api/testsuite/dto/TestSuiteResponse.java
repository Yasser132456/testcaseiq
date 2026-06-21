package com.testcaseiq.api.testsuite.dto;

import java.time.Instant;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.model.TestSuite;

public record TestSuiteResponse(
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
        Instant createdAt,
        Instant updatedAt
) {
    public static TestSuiteResponse from(TestSuite suite) {
        var cases = suite.getTestCases();
        int approved = (int) cases.stream()
                .filter(c -> c.getReviewStatus() == ReviewStatus.APPROVED).count();
        int rejected = (int) cases.stream()
                .filter(c -> c.getReviewStatus() == ReviewStatus.REJECTED).count();
        return new TestSuiteResponse(
                suite.getId(),
                suite.getStory().getId(),
                suite.getStory().getTitle(),
                suite.getStory().getProject().getId(),
                suite.getStory().getProject().getName(),
                suite.getName(),
                suite.getDescription(),
                suite.getTestLayer() != null ? suite.getTestLayer().name() : null,
                cases.size(),
                approved,
                rejected,
                suite.getCreatedAt(),
                suite.getUpdatedAt()
        );
    }
}
