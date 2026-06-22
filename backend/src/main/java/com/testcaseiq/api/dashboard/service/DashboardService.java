package com.testcaseiq.api.dashboard.service;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.audit.AuditEventRepository;
import com.testcaseiq.api.dashboard.dto.DashboardMetricsResponse;
import com.testcaseiq.api.dashboard.dto.DashboardMetricsResponse.RecentActivityItem;
import com.testcaseiq.api.dashboard.dto.DashboardMetricsResponse.RecentProjectItem;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.repository.ExportJobRepository;
import com.testcaseiq.api.domain.repository.ProjectRepository;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.domain.repository.TestCaseRepository;
import com.testcaseiq.api.domain.repository.TestSuiteRepository;

@Service
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final StoryRepository storyRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final TestCaseRepository testCaseRepository;
    private final ExportJobRepository exportJobRepository;
    private final AuditEventRepository auditEventRepository;

    public DashboardService(ProjectRepository projectRepository,
                            StoryRepository storyRepository,
                            TestSuiteRepository testSuiteRepository,
                            TestCaseRepository testCaseRepository,
                            ExportJobRepository exportJobRepository,
                            AuditEventRepository auditEventRepository) {
        this.projectRepository = projectRepository;
        this.storyRepository = storyRepository;
        this.testSuiteRepository = testSuiteRepository;
        this.testCaseRepository = testCaseRepository;
        this.exportJobRepository = exportJobRepository;
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional(readOnly = true)
    public DashboardMetricsResponse getMetrics() {
        long totalProjects = projectRepository.count();
        long totalStories = storyRepository.count();
        long storiesWithTests = storyRepository.countStoriesWithTestSuites();
        long storiesWithoutTests = totalStories - storiesWithTests;
        long totalTestSuites = testSuiteRepository.count();
        long totalTestCases = testCaseRepository.count();
        long approved = testCaseRepository.countByReviewStatus(ReviewStatus.APPROVED);
        long rejected = testCaseRepository.countByReviewStatus(ReviewStatus.REJECTED);
        long pendingReview = testCaseRepository.countByReviewStatus(ReviewStatus.NEEDS_REVIEW);
        long draft = testCaseRepository.countByReviewStatus(ReviewStatus.DRAFT);
        long totalExports = exportJobRepository.count();

        List<RecentProjectItem> recentProjects = projectRepository.findTop3ByOrderByUpdatedAtDesc()
                .stream()
                .map(p -> new RecentProjectItem(
                        p.getId().toString(),
                        p.getName(),
                        p.getKey(),
                        p.getDescription(),
                        p.getUpdatedAt().toString()
                ))
                .toList();

        List<RecentActivityItem> recentActivity = auditEventRepository
                .findWithFilters(null, null, null, null, null, null, null, PageRequest.of(0, 8))
                .stream()
                .map(e -> new RecentActivityItem(
                        e.getTimestamp().toString(),
                        e.getAction(),
                        e.getActorEmail(),
                        e.getActorRole(),
                        e.getResourceType(),
                        e.getOutcome(),
                        e.getSummary()
                ))
                .toList();

        return new DashboardMetricsResponse(
                totalProjects,
                totalStories,
                storiesWithTests,
                storiesWithoutTests,
                totalTestSuites,
                totalTestCases,
                approved,
                rejected,
                pendingReview,
                draft,
                totalExports,
                rate(approved, totalTestCases),
                rate(rejected, totalTestCases),
                rate(pendingReview, totalTestCases),
                rate(approved, totalTestCases),
                recentProjects,
                recentActivity
        );
    }

    private double rate(long part, long total) {
        if (total == 0) return 0.0;
        return Math.round((double) part / total * 1000.0) / 10.0;
    }
}
