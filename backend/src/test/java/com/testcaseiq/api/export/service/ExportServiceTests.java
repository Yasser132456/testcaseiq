package com.testcaseiq.api.export.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.ExportStatus;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;
import com.testcaseiq.api.domain.model.ExportJob;
import com.testcaseiq.api.domain.model.Project;
import com.testcaseiq.api.domain.model.Requirement;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestData;
import com.testcaseiq.api.domain.model.TestStep;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.ExportJobRepository;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.domain.repository.TestSuiteRepository;
import com.testcaseiq.api.export.dto.ExportFormat;

@ExtendWith(MockitoExtension.class)
class ExportServiceTests {

    @Mock
    private StoryRepository storyRepository;

    @Mock
    private TestSuiteRepository testSuiteRepository;

    @Mock
    private ExportJobRepository exportJobRepository;

    private ExportService exportService;

    @BeforeEach
    void setUp() {
        exportService = new ExportService(
                storyRepository,
                testSuiteRepository,
                exportJobRepository,
                new ObjectMapper()
        );
    }

    @Test
    void markdownExportContainsOnlyApprovedTestCases() {
        Story story = storyWithMixedReviewStatuses();
        UUID storyId = story.getId();
        when(storyRepository.findById(storyId)).thenReturn(Optional.of(story));

        String content = exportService.exportStory(storyId, ExportFormat.MARKDOWN).content();

        assertThat(content).contains("# Approved Test Cases for Checkout payment");
        assertThat(content).contains("External Reference: PAY-42");
        assertThat(content).contains("## Checkout regression");
        assertThat(content).contains("### Pay by card successfully");
        assertThat(content).contains("Test Case ID:");
        assertThat(content).contains("Objective: Covers an approved card payment.");
        assertThat(content).contains("Type: FUNCTIONAL");
        assertThat(content).contains("Layer: UI");
        assertThat(content).contains("Priority: HIGH");
        assertThat(content).contains("Risk: HIGH");
        assertThat(content).contains("Review Status: APPROVED");
        assertThat(content).contains("Automation Candidate: true");
        assertThat(content).contains("Preconditions: Buyer is signed in.");
        assertThat(content).contains("| 1 | Submit valid card details | Payment is authorized |");
        assertThat(content).contains("valid-card: {\"cardNumber\":\"4111111111111111\"}");
        assertThat(content).contains("REQ-PAY-1");
        assertThat(content).contains("BDD Scenario: Given a valid card");
        assertThat(content).doesNotContain("Rejected card payment");
        assertThat(content).doesNotContain("Draft payment test");
        assertThat(content).doesNotContain("Needs review payment test");
        assertThat(content).doesNotContain("Needs clarification payment test");
    }

    @Test
    void csvExportContainsOnlyApprovedTestCases() {
        Story story = storyWithMixedReviewStatuses();
        UUID storyId = story.getId();
        UUID approvedId = story.getTestSuites().getFirst().getTestCases().getFirst().getId();
        when(storyRepository.findById(storyId)).thenReturn(Optional.of(story));

        String content = exportService.exportStory(storyId, ExportFormat.CSV).content();

        assertThat(content).startsWith("storyTitle,storyReference,testSuiteName,testCaseId,title,objective,type,layer,priority,risk,reviewStatus,automationCandidate,confidenceScore,preconditions,steps,testData,linkedRequirementReferences,sourceEvidence,bddScenario");
        assertThat(content).contains("Checkout payment,PAY-42,Checkout regression," + approvedId);
        assertThat(content).contains("Pay by card successfully");
        assertThat(content).contains("Submit valid card details => Payment is authorized");
        assertThat(content).contains("REQ-PAY-1");
        assertThat(content).doesNotContain("Rejected card payment");
        assertThat(content).doesNotContain("Draft payment test");
        assertThat(content).doesNotContain("Needs review payment test");
        assertThat(content).doesNotContain("Needs clarification payment test");
    }

    @Test
    void jsonExportContainsOnlyApprovedTestCases() {
        Story story = storyWithMixedReviewStatuses();
        UUID storyId = story.getId();
        when(storyRepository.findById(storyId)).thenReturn(Optional.of(story));

        String content = exportService.exportStory(storyId, ExportFormat.JSON).content();

        assertThat(content).contains("\"storyTitle\" : \"Checkout payment\"");
        assertThat(content).contains("\"storyReference\" : \"PAY-42\"");
        assertThat(content).contains("\"testSuiteName\" : \"Checkout regression\"");
        assertThat(content).contains("\"title\" : \"Pay by card successfully\"");
        assertThat(content).contains("\"reviewStatus\" : \"APPROVED\"");
        assertThat(content).contains("\"automationCandidate\" : true");
        assertThat(content).contains("\"linkedRequirementReferences\" : [ \"REQ-PAY-1\" ]");
        assertThat(content).doesNotContain("Rejected card payment");
        assertThat(content).doesNotContain("Draft payment test");
        assertThat(content).doesNotContain("Needs review payment test");
        assertThat(content).doesNotContain("Needs clarification payment test");
    }

    @Test
    void createsCompletedExportJobForSuccessfulStoryExport() {
        Story story = storyWithMixedReviewStatuses();
        UUID storyId = story.getId();
        when(storyRepository.findById(storyId)).thenReturn(Optional.of(story));

        exportService.exportStory(storyId, ExportFormat.JSON);

        ArgumentCaptor<ExportJob> captor = ArgumentCaptor.forClass(ExportJob.class);
        verify(exportJobRepository).save(captor.capture());
        ExportJob job = captor.getValue();
        assertThat(job.getStory()).isEqualTo(story);
        assertThat(job.getExportType()).isEqualTo("approved-test-cases-json");
        assertThat(job.getStatus()).isEqualTo(ExportStatus.COMPLETED);
    }

    @Test
    void marksExportJobFailedWhenFormattingFails() {
        Story story = storyWithMixedReviewStatuses();
        UUID storyId = story.getId();
        ExportService failingService = new ExportService(
                storyRepository,
                testSuiteRepository,
                exportJobRepository,
                new ObjectMapper() {
                    @Override
                    public String writeValueAsString(Object value) throws com.fasterxml.jackson.core.JsonProcessingException {
                        throw new com.fasterxml.jackson.core.JsonProcessingException("boom") {
                        };
                    }
                }
        );
        when(storyRepository.findById(storyId)).thenReturn(Optional.of(story));

        assertThatThrownBy(() -> failingService.exportStory(storyId, ExportFormat.JSON))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Unable to export approved test cases");

        ArgumentCaptor<ExportJob> captor = ArgumentCaptor.forClass(ExportJob.class);
        verify(exportJobRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ExportStatus.FAILED);
    }

    @Test
    void returnsCleanEmptyExportWhenNoApprovedTestCasesExist() {
        Story story = storyWithoutApprovedTestCases();
        UUID storyId = story.getId();
        when(storyRepository.findById(storyId)).thenReturn(Optional.of(story));

        String content = exportService.exportStory(storyId, ExportFormat.MARKDOWN).content();

        assertThat(content).contains("# Approved Test Cases for Checkout payment");
        assertThat(content).contains("No approved test cases are available for export.");
    }

    @Test
    void throwsNotFoundWhenStoryDoesNotExist() {
        UUID storyId = UUID.randomUUID();
        when(storyRepository.findById(storyId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> exportService.exportStory(storyId, ExportFormat.JSON))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Story not found: " + storyId);
    }

    @Test
    void canExportByTestSuiteId() {
        Story story = storyWithMixedReviewStatuses();
        TestSuite testSuite = story.getTestSuites().getFirst();
        UUID testSuiteId = testSuite.getId();
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(testSuite));

        String content = exportService.exportTestSuite(testSuiteId, ExportFormat.MARKDOWN).content();

        assertThat(content).contains("## Checkout regression");
        assertThat(content).contains("Pay by card successfully");
        assertThat(content).doesNotContain("Rejected card payment");
    }

    private Story storyWithMixedReviewStatuses() {
        Story story = new Story("Checkout payment", StoryType.USER_STORY);
        setId(story, UUID.randomUUID());
        story.setExternalReference("PAY-42");
        story.setProject(new Project("Checkout Platform", "CHECKOUT"));

        Requirement requirement = new Requirement("Authorized card payments", RequirementType.FUNCTIONAL);
        setId(requirement, UUID.randomUUID());
        requirement.setSourceReference("REQ-PAY-1");
        story.addRequirement(requirement);

        TestSuite suite = new TestSuite("Checkout regression");
        setId(suite, UUID.randomUUID());
        story.addTestSuite(suite);

        TestCase approved = testCase("Pay by card successfully", ReviewStatus.APPROVED);
        approved.setDescription("Covers an approved card payment.");
        approved.setTestLayer(TestLayer.UI);
        approved.setPriority(Priority.HIGH);
        approved.setRiskLevel(RiskLevel.HIGH);
        approved.setAutomationCandidate(true);
        approved.setPreconditions("Buyer is signed in.");
        approved.setExpectedResult("Given a valid card");
        approved.addStep(new TestStep(1, "Submit valid card details", "Payment is authorized"));
        approved.addTestData(new TestData("valid-card", "{\"cardNumber\":\"4111111111111111\"}"));
        approved.linkRequirement(requirement);
        suite.addTestCase(approved);

        suite.addTestCase(testCase("Rejected card payment", ReviewStatus.REJECTED));
        suite.addTestCase(testCase("Draft payment test", ReviewStatus.DRAFT));
        suite.addTestCase(testCase("Needs review payment test", ReviewStatus.NEEDS_REVIEW));
        suite.addTestCase(testCase("Needs clarification payment test", ReviewStatus.NEEDS_CLARIFICATION));
        return story;
    }

    private Story storyWithoutApprovedTestCases() {
        Story story = new Story("Checkout payment", StoryType.USER_STORY);
        setId(story, UUID.randomUUID());
        story.setProject(new Project("Checkout Platform", "CHECKOUT"));
        TestSuite suite = new TestSuite("Checkout regression");
        setId(suite, UUID.randomUUID());
        suite.addTestCase(testCase("Draft payment test", ReviewStatus.DRAFT));
        story.addTestSuite(suite);
        return story;
    }

    private TestCase testCase(String title, ReviewStatus reviewStatus) {
        TestCase testCase = new TestCase(title, TestCaseType.FUNCTIONAL);
        setId(testCase, UUID.randomUUID());
        testCase.setReviewStatus(reviewStatus);
        return testCase;
    }

    private void setId(Object entity, UUID id) {
        ReflectionTestUtils.setField(entity, "id", id);
    }
}
