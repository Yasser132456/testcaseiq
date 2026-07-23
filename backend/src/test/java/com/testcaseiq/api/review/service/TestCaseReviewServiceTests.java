package com.testcaseiq.api.review.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.testcaseiq.api.ai.service.AiGenerationService;
import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.model.ReviewEvent;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.ReviewEventRepository;
import com.testcaseiq.api.domain.repository.TestCaseRepository;
import com.testcaseiq.api.review.dto.ReviewEventResponse;
import com.testcaseiq.api.review.dto.TestCasePriorityUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseReviewStatusUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseRiskUpdateRequest;

@ExtendWith(MockitoExtension.class)
class TestCaseReviewServiceTests {

    @Mock
    private TestCaseRepository testCaseRepository;

    @Mock
    private ReviewEventRepository reviewEventRepository;

    @Mock
    private AiGenerationService aiGenerationService;

    private TestCaseReviewService service;

    @BeforeEach
    void setUp() {
        service = new TestCaseReviewService(testCaseRepository, reviewEventRepository, aiGenerationService);
    }

    @Test
    void updatesReviewStatusAndRecordsEvent() {
        TestCase testCase = testCase();
        when(testCaseRepository.findById(testCase.getId())).thenReturn(Optional.of(testCase));
        when(testCaseRepository.save(testCase)).thenReturn(testCase);

        service.updateReviewStatus(testCase.getId(), new TestCaseReviewStatusUpdateRequest(ReviewStatus.APPROVED, "Ready"));

        assertThat(testCase.getReviewStatus()).isEqualTo(ReviewStatus.APPROVED);
        assertThat(testCase.getReviewEvents()).hasSize(1);
        assertThat(testCase.getReviewEvents().get(0).getActionType()).isEqualTo("REVIEW_STATUS_UPDATED");
        assertThat(testCase.getReviewEvents().get(0).getPreviousValue()).isEqualTo("NEEDS_REVIEW");
        assertThat(testCase.getReviewEvents().get(0).getNewValue()).isEqualTo("APPROVED");
        verify(testCaseRepository).save(testCase);
    }

    @Test
    void rejectsRejectedStatusWithoutComment() {
        TestCase testCase = testCase();

        assertThatThrownBy(() -> service.updateReviewStatus(
                testCase.getId(),
                new TestCaseReviewStatusUpdateRequest(ReviewStatus.REJECTED, " ", false)
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("A review comment is required when rejecting or requesting clarification");
    }

    @Test
    void rejectedStatusCanChainRegenerationFromComment() {
        TestCase testCase = testCase();
        when(testCaseRepository.findById(testCase.getId())).thenReturn(Optional.of(testCase));
        when(testCaseRepository.save(testCase)).thenReturn(testCase);

        service.updateReviewStatus(
                testCase.getId(),
                new TestCaseReviewStatusUpdateRequest(ReviewStatus.REJECTED, "Cover the denied-card branch.", true)
        );

        verify(aiGenerationService).regenerateTestCase(testCase.getId(), "Cover the denied-card branch.", "local-reviewer");
    }

    @Test
    void updatesPriorityAndRecordsEvent() {
        TestCase testCase = testCase();
        when(testCaseRepository.findById(testCase.getId())).thenReturn(Optional.of(testCase));
        when(testCaseRepository.save(testCase)).thenReturn(testCase);

        service.updatePriority(testCase.getId(), new TestCasePriorityUpdateRequest(Priority.CRITICAL, "Escalate"));

        assertThat(testCase.getPriority()).isEqualTo(Priority.CRITICAL);
        assertThat(testCase.getReviewEvents().get(0).getActionType()).isEqualTo("PRIORITY_UPDATED");
        assertThat(testCase.getReviewEvents().get(0).getPreviousValue()).isEqualTo("HIGH");
        assertThat(testCase.getReviewEvents().get(0).getNewValue()).isEqualTo("CRITICAL");
    }

    @Test
    void updatesRiskAndRecordsEvent() {
        TestCase testCase = testCase();
        when(testCaseRepository.findById(testCase.getId())).thenReturn(Optional.of(testCase));
        when(testCaseRepository.save(testCase)).thenReturn(testCase);

        service.updateRisk(testCase.getId(), new TestCaseRiskUpdateRequest(RiskLevel.HIGH, "Risk changed"));

        assertThat(testCase.getRiskLevel()).isEqualTo(RiskLevel.HIGH);
        assertThat(testCase.getReviewEvents().get(0).getActionType()).isEqualTo("RISK_UPDATED");
        assertThat(testCase.getReviewEvents().get(0).getPreviousValue()).isEqualTo("MEDIUM");
        assertThat(testCase.getReviewEvents().get(0).getNewValue()).isEqualTo("HIGH");
    }

    @Test
    void returnsReviewEventHistory() {
        TestCase testCase = testCase();
        ReviewEvent event = new ReviewEvent(ReviewStatus.APPROVED, "local-reviewer");
        ReflectionTestUtils.setField(event, "id", UUID.randomUUID());
        event.setActionType("REVIEW_STATUS_UPDATED");
        event.setPreviousValue("NEEDS_REVIEW");
        event.setNewValue("APPROVED");
        testCase.addReviewEvent(event);

        when(testCaseRepository.findById(testCase.getId())).thenReturn(Optional.of(testCase));
        when(reviewEventRepository.findByTestCaseIdOrderByCreatedAtDesc(testCase.getId())).thenReturn(List.of(event));

        List<ReviewEventResponse> history = service.getReviewEvents(testCase.getId());

        assertThat(history).hasSize(1);
        assertThat(history.get(0).actionType()).isEqualTo("REVIEW_STATUS_UPDATED");
        assertThat(history.get(0).previousValue()).isEqualTo("NEEDS_REVIEW");
    }

    private TestCase testCase() {
        TestSuite suite = new TestSuite("Mock AI Regression Suite");
        ReflectionTestUtils.setField(suite, "id", UUID.randomUUID());
        TestCase testCase = new TestCase("Complete primary workflow", TestCaseType.FUNCTIONAL);
        ReflectionTestUtils.setField(testCase, "id", UUID.randomUUID());
        testCase.setReviewStatus(ReviewStatus.NEEDS_REVIEW);
        testCase.setPriority(Priority.HIGH);
        testCase.setRiskLevel(RiskLevel.MEDIUM);
        suite.addTestCase(testCase);
        return testCase;
    }
}
