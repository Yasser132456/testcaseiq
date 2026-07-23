package com.testcaseiq.api.review.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.ai.service.AiGenerationService;
import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.model.Requirement;
import com.testcaseiq.api.domain.model.ReviewEvent;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestStep;
import com.testcaseiq.api.domain.repository.ReviewEventRepository;
import com.testcaseiq.api.domain.repository.TestCaseRepository;
import com.testcaseiq.api.review.dto.ReviewEventResponse;
import com.testcaseiq.api.review.dto.TestCaseAutomationCandidateUpdateRequest;
import com.testcaseiq.api.review.dto.TestCasePriorityUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseResponse;
import com.testcaseiq.api.review.dto.TestCaseReviewStatusUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseRiskUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseUpdateRequest;
import com.testcaseiq.api.review.dto.TestStepRequest;
import com.testcaseiq.api.review.dto.TestStepResponse;

@Service
public class TestCaseReviewService {

    private static final String LOCAL_REVIEWER = "local-reviewer";

    private final TestCaseRepository testCaseRepository;
    private final ReviewEventRepository reviewEventRepository;
    private final AiGenerationService aiGenerationService;

    public TestCaseReviewService(
            TestCaseRepository testCaseRepository,
            ReviewEventRepository reviewEventRepository,
            AiGenerationService aiGenerationService
    ) {
        this.testCaseRepository = testCaseRepository;
        this.reviewEventRepository = reviewEventRepository;
        this.aiGenerationService = aiGenerationService;
    }

    @Transactional
    public TestCaseResponse updateReviewStatus(UUID testCaseId, TestCaseReviewStatusUpdateRequest request) {
        if (request.status() == ReviewStatus.EXPORTED) {
            throw new BadRequestException("Review status EXPORTED cannot be set manually in this sprint");
        }
        if ((request.status() == ReviewStatus.REJECTED || request.status() == ReviewStatus.NEEDS_CLARIFICATION)
                && (request.comment() == null || request.comment().isBlank())) {
            throw new BadRequestException("A review comment is required when rejecting or requesting clarification");
        }
        TestCase testCase = findTestCase(testCaseId);
        ReviewStatus previousStatus = testCase.getReviewStatus();
        testCase.setReviewStatus(request.status());
        addReviewEvent(testCase, request.status(), "REVIEW_STATUS_UPDATED", previousStatus, request.status(), request.comment());
        TestCase savedTestCase = testCaseRepository.save(testCase);
        if (request.regenerate() && (request.status() == ReviewStatus.REJECTED || request.status() == ReviewStatus.NEEDS_CLARIFICATION)) {
            return aiGenerationService.regenerateTestCase(testCaseId, request.comment(), LOCAL_REVIEWER);
        }
        return toTestCaseResponse(savedTestCase);
    }

    @Transactional
    public TestCaseResponse updatePriority(UUID testCaseId, TestCasePriorityUpdateRequest request) {
        TestCase testCase = findTestCase(testCaseId);
        Priority previousPriority = testCase.getPriority();
        testCase.setPriority(request.priority());
        addReviewEvent(testCase, testCase.getReviewStatus(), "PRIORITY_UPDATED", previousPriority, request.priority(), request.comment());
        return toTestCaseResponse(testCaseRepository.save(testCase));
    }

    @Transactional
    public TestCaseResponse updateRisk(UUID testCaseId, TestCaseRiskUpdateRequest request) {
        TestCase testCase = findTestCase(testCaseId);
        RiskLevel previousRisk = testCase.getRiskLevel();
        testCase.setRiskLevel(request.riskLevel());
        addReviewEvent(testCase, testCase.getReviewStatus(), "RISK_UPDATED", previousRisk, request.riskLevel(), request.comment());
        return toTestCaseResponse(testCaseRepository.save(testCase));
    }

    @Transactional
    public TestCaseResponse updateAutomationCandidate(UUID testCaseId, TestCaseAutomationCandidateUpdateRequest request) {
        TestCase testCase = findTestCase(testCaseId);
        boolean previousValue = testCase.isAutomationCandidate();
        testCase.setAutomationCandidate(request.automationCandidate());
        addReviewEvent(
                testCase,
                testCase.getReviewStatus(),
                "AUTOMATION_CANDIDATE_UPDATED",
                previousValue,
                request.automationCandidate(),
                request.comment()
        );
        return toTestCaseResponse(testCaseRepository.save(testCase));
    }

    @Transactional
    public TestCaseResponse updateTestCase(UUID testCaseId, TestCaseUpdateRequest request) {
        TestCase testCase = findTestCase(testCaseId);
        List<String> changedFields = new java.util.ArrayList<>();

        if (request.title() != null) {
            String title = request.title().trim();
            if (title.isBlank()) {
                throw new BadRequestException("Test case title cannot be blank");
            }
            if (!Objects.equals(testCase.getTitle(), title)) {
                changedFields.add("title");
                testCase.setTitle(title);
            }
        }
        if (request.objective() != null && !Objects.equals(testCase.getDescription(), request.objective())) {
            changedFields.add("objective");
            testCase.setDescription(request.objective());
        }
        if (request.preconditions() != null && !Objects.equals(testCase.getPreconditions(), request.preconditions())) {
            changedFields.add("preconditions");
            testCase.setPreconditions(request.preconditions());
        }
        if (request.bddScenario() != null && !Objects.equals(testCase.getExpectedResult(), request.bddScenario())) {
            changedFields.add("bddScenario");
            testCase.setExpectedResult(request.bddScenario());
        }
        if (request.steps() != null) {
            changedFields.add("steps");
            testCase.replaceSteps(request.steps().stream()
                    .map(this::toTestStep)
                    .toList());
        }

        if (!changedFields.isEmpty()) {
            addReviewEvent(
                    testCase,
                    testCase.getReviewStatus(),
                    "TEST_CASE_UPDATED",
                    null,
                    String.join(",", changedFields),
                    request.comment()
            );
        }

        return toTestCaseResponse(testCaseRepository.save(testCase));
    }

    @Transactional(readOnly = true)
    public List<ReviewEventResponse> getReviewEvents(UUID testCaseId) {
        findTestCase(testCaseId);
        return reviewEventRepository.findByTestCaseIdOrderByCreatedAtDesc(testCaseId).stream()
                .map(this::toReviewEventResponse)
                .toList();
    }

    private TestCase findTestCase(UUID testCaseId) {
        return testCaseRepository.findById(testCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Test case not found: " + testCaseId));
    }

    private TestStep toTestStep(TestStepRequest request) {
        return new TestStep(request.order(), request.action(), request.expectedResult());
    }

    private void addReviewEvent(
            TestCase testCase,
            ReviewStatus status,
            String actionType,
            Object previousValue,
            Object newValue,
            String comment
    ) {
        ReviewEvent reviewEvent = new ReviewEvent(status, LOCAL_REVIEWER);
        reviewEvent.setActionType(actionType);
        reviewEvent.setPreviousValue(previousValue == null ? null : previousValue.toString());
        reviewEvent.setNewValue(newValue == null ? null : newValue.toString());
        reviewEvent.setComment(comment);
        testCase.addReviewEvent(reviewEvent);
    }

    private TestCaseResponse toTestCaseResponse(TestCase testCase) {
        return new TestCaseResponse(
                testCase.getId(),
                testCase.getTestSuite().getId(),
                testCase.getTitle(),
                testCase.getDescription(),
                testCase.getType(),
                testCase.getTestLayer(),
                testCase.getPriority(),
                testCase.getRiskLevel(),
                testCase.getReviewStatus(),
                testCase.isAutomationCandidate(),
                testCase.getPreconditions(),
                testCase.getExpectedResult(),
                testCase.getRequirements().stream()
                        .map(Requirement::getSourceReference)
                        .filter(reference -> reference != null)
                        .toList(),
                testCase.getTestSteps().stream()
                        .map(this::toTestStepResponse)
                        .toList(),
                testCase.getCreatedAt(),
                testCase.getUpdatedAt()
        );
    }

    private TestStepResponse toTestStepResponse(TestStep testStep) {
        return new TestStepResponse(
                testStep.getId(),
                testStep.getStepOrder(),
                testStep.getAction(),
                testStep.getExpectedResult()
        );
    }

    private ReviewEventResponse toReviewEventResponse(ReviewEvent reviewEvent) {
        return new ReviewEventResponse(
                reviewEvent.getId(),
                reviewEvent.getTestCase().getId(),
                reviewEvent.getStatus(),
                reviewEvent.getActionType(),
                reviewEvent.getPreviousValue(),
                reviewEvent.getNewValue(),
                reviewEvent.getReviewer(),
                reviewEvent.getComment(),
                reviewEvent.getCreatedAt()
        );
    }
}
