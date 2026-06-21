package com.testcaseiq.api.testsuite.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.ConfidenceLevel;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.TestSuiteRepository;
import com.testcaseiq.api.testsuite.dto.TestSuiteDetailResponse;
import com.testcaseiq.api.testsuite.dto.TestSuiteResponse;
import com.testcaseiq.api.testsuite.dto.TestSuiteUpdateRequest;

@Service
public class TestSuiteService {

    private final TestSuiteRepository testSuiteRepository;

    public TestSuiteService(TestSuiteRepository testSuiteRepository) {
        this.testSuiteRepository = testSuiteRepository;
    }

    @Transactional(readOnly = true)
    public Page<TestSuiteResponse> listSuites(UUID storyId, UUID projectId, boolean approvedOnly, int page, int size) {
        return testSuiteRepository.findWithFilters(storyId, projectId, approvedOnly, ReviewStatus.APPROVED,
                PageRequest.of(page, size)).map(TestSuiteResponse::from);
    }

    @Transactional(readOnly = true)
    public TestSuiteDetailResponse getSuiteDetail(UUID id) {
        TestSuite suite = testSuiteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Test suite not found: " + id));
        return buildDetail(suite);
    }

    @Transactional
    public TestSuiteResponse updateSuite(UUID id, TestSuiteUpdateRequest request) {
        TestSuite suite = testSuiteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Test suite not found: " + id));
        suite.setDescription(request.description());
        if (request.testLayer() != null) {
            suite.setTestLayer(request.testLayer());
        }
        return TestSuiteResponse.from(testSuiteRepository.save(suite));
    }

    @Transactional
    public UUID deleteSuite(UUID id) {
        TestSuite suite = testSuiteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Test suite not found: " + id));
        UUID storyId = suite.getStory().getId();
        testSuiteRepository.delete(suite);
        return storyId;
    }

    private TestSuiteDetailResponse buildDetail(TestSuite suite) {
        var cases = suite.getTestCases();
        int approved = (int) cases.stream()
                .filter(c -> c.getReviewStatus() == ReviewStatus.APPROVED).count();
        int rejected = (int) cases.stream()
                .filter(c -> c.getReviewStatus() == ReviewStatus.REJECTED).count();
        var summaries = cases.stream()
                .map(TestSuiteDetailResponse.TestCaseSummary::from).toList();
        return new TestSuiteDetailResponse(
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
                summaries,
                suite.getCreatedAt(),
                suite.getUpdatedAt(),
                buildExplainabilitySummary(cases)
        );
    }

    private String buildExplainabilitySummary(java.util.List<TestCase> cases) {
        if (cases == null || cases.isEmpty()) {
            return "No test cases in this suite.";
        }
        long scored = cases.stream().filter(tc -> tc.getQualityScore() != null).count();
        if (scored == 0) {
            return "Quality metadata is not available for this suite (generated before scoring was enabled).";
        }
        long high = cases.stream().filter(tc -> tc.getConfidenceLevel() == ConfidenceLevel.HIGH).count();
        long medium = cases.stream().filter(tc -> tc.getConfidenceLevel() == ConfidenceLevel.MEDIUM).count();
        long low = cases.stream().filter(tc -> tc.getConfidenceLevel() == ConfidenceLevel.LOW).count();
        java.util.OptionalDouble avg = cases.stream()
                .filter(tc -> tc.getQualityScore() != null)
                .mapToInt(TestCase::getQualityScore)
                .average();
        return String.format(
                "%d test case(s) scored: %d HIGH confidence, %d MEDIUM, %d LOW. Average quality score: %.0f/100.",
                scored, high, medium, low, avg.orElse(0.0)
        );
    }
}
