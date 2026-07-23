package com.testcaseiq.api.dashboard.dto;

import java.util.List;

public record DashboardMetricsResponse(
        long totalProjects,
        long totalStories,
        long storiesWithGeneratedTests,
        long storiesWithoutGeneratedTests,
        long totalTestSuites,
        long totalTestCases,
        long approvedTestCases,
        long rejectedTestCases,
        long pendingReviewTestCases,
        long draftTestCases,
        long totalExports,
        long storiesWithUncoveredHighRiskRequirements,
        double approvalRate,
        double rejectionRate,
        double pendingReviewRate,
        double exportReadinessRate,
        List<RecentProjectItem> recentProjects,
        List<RecentActivityItem> recentActivity
) {
    public record RecentProjectItem(
            String id,
            String name,
            String key,
            String description,
            String updatedAt
    ) {}

    public record RecentActivityItem(
            String timestamp,
            String action,
            String actorEmail,
            String actorRole,
            String resourceType,
            String outcome,
            String summary
    ) {}
}
