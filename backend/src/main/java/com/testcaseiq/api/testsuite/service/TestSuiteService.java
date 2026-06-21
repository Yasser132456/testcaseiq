package com.testcaseiq.api.testsuite.service;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.ReviewStatus;
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
                suite.getUpdatedAt()
        );
    }
}
