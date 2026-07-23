package com.testcaseiq.api.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.ai.dto.AmbiguityDetectionResult;
import com.testcaseiq.api.ai.dto.CoverageItemDto;
import com.testcaseiq.api.ai.dto.CoveragePlanResult;
import com.testcaseiq.api.ai.dto.ExtractedAmbiguityDto;
import com.testcaseiq.api.ai.dto.ExtractedRequirementDto;
import com.testcaseiq.api.ai.dto.GeneratedTestCaseDto;
import com.testcaseiq.api.ai.dto.GeneratedTestDataDto;
import com.testcaseiq.api.ai.dto.GeneratedTestStepDto;
import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.QaValidationResult;
import com.testcaseiq.api.ai.dto.RequirementExtractionResult;
import com.testcaseiq.api.ai.dto.TestGenerationOptions;
import com.testcaseiq.api.ai.dto.RegenerateContext;
import com.testcaseiq.api.ai.dto.StoryAnalysisRequest;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.dto.TestGenerationRequest;
import com.testcaseiq.api.ai.provider.AiGenerationProvider;
import com.testcaseiq.api.ai.provider.AiProviderException;
import com.testcaseiq.api.ai.validation.AiOutputValidationService;
import com.testcaseiq.api.domain.enums.AiJobStatus;
import com.testcaseiq.api.domain.enums.FocusArea;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;
import com.testcaseiq.api.domain.enums.CoverageCategory;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;
import com.testcaseiq.api.domain.model.Project;
import com.testcaseiq.api.domain.model.Ambiguity;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestData;
import com.testcaseiq.api.domain.model.TestStep;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.AiJobRepository;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.domain.repository.TestCaseRepository;
import com.testcaseiq.api.ai.service.TestCaseQualityScoringService;

@ExtendWith(MockitoExtension.class)
class AiGenerationServiceTests {

    @Mock
    private StoryRepository storyRepository;

    @Mock
    private AiJobRepository aiJobRepository;

    @Mock
    private AiGenerationProvider aiGenerationProvider;

    @Mock
    private TestCaseRepository testCaseRepository;

    private AiGenerationService aiGenerationService;

    @BeforeEach
    void setUp() {
        aiGenerationService = new AiGenerationService(
                storyRepository,
                aiJobRepository,
                testCaseRepository,
                aiGenerationProvider,
                new AiOutputValidationService(),
                new TestCaseQualityScoringService(),
                new ObjectMapper()
        );
    }

    @Test
    void analyzeStoryPersistsDomainObjectsAndAiJob() {
        Story story = story();
        StoryAnalysisResult result = analysisResult(story.getId());
        when(storyRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(aiGenerationProvider.analyzeStory(any(StoryAnalysisRequest.class))).thenReturn(result);
        when(aiGenerationProvider.providerName()).thenReturn("mock-ai-provider");

        StoryAnalysisResult response = aiGenerationService.analyzeStory(story.getId());

        assertThat(response).isEqualTo(result);
        assertThat(story.getStatus()).isEqualTo(StoryStatus.ANALYZED);
        assertThat(story.getRequirements()).hasSize(1);
        assertThat(story.getAmbiguities()).hasSize(1);
        assertThat(story.getCoverageItems()).hasSize(1);
        assertThat(story.getAiJobs()).hasSize(1);
        assertThat(story.getAiJobs().get(0).getJobType()).isEqualTo("story-analysis");
        assertThat(story.getAiJobs().get(0).getStatus()).isEqualTo(AiJobStatus.COMPLETED);
        assertThat(story.getAiJobs().get(0).getProviderName()).isEqualTo("mock-ai-provider");
        verify(storyRepository).save(story);
    }

    @Test
    void generateTestCasesPersistsSuiteCasesStepsDataAndAiJob() {
        Story story = story();
        story.addRequirement(requirement());
        GeneratedTestSuiteResult result = generatedSuiteResult(story.getId());
        when(storyRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(aiGenerationProvider.generateTestCases(any(TestGenerationRequest.class))).thenReturn(result);
        when(aiGenerationProvider.providerName()).thenReturn("mock-ai-provider");
        when(storyRepository.save(story)).thenAnswer(invocation -> {
            assignGeneratedIds(story);
            return story;
        });

        GeneratedTestSuiteResult response = aiGenerationService.generateTestCases(story.getId());

        assertThat(response.id()).isNotNull();
        assertThat(response.suiteName()).isEqualTo(result.suiteName());
        assertThat(response.provider()).isEqualTo(result.provider());
        assertThat(response.qaValidation()).isEqualTo(result.qaValidation());
        assertThat(response.testCases()).hasSize(1);
        assertThat(response.testCases().get(0).id()).isNotNull();
        assertThat(response.testCases().get(0).reviewStatus()).isEqualTo(ReviewStatus.NEEDS_REVIEW);
        assertThat(response.testCases().get(0).confidenceScore()).isEqualTo(0.9);
        assertThat(response.testCases().get(0).steps().get(0).id()).isNotNull();
        assertThat(response.testCases().get(0).testData().get(0).id()).isNotNull();
        assertThat(story.getStatus()).isEqualTo(StoryStatus.TESTS_GENERATED);
        assertThat(story.getTestSuites()).hasSize(1);
        assertThat(story.getTestSuites().get(0).getTestCases()).hasSize(1);
        assertThat(story.getTestSuites().get(0).getTestCases().get(0).getTestSteps()).hasSize(1);
        assertThat(story.getTestSuites().get(0).getTestCases().get(0).getTestDataEntries()).hasSize(1);
        assertThat(story.getAiJobs()).hasSize(1);
        assertThat(story.getAiJobs().get(0).getJobType()).isEqualTo("test-generation");
        assertThat(story.getAiJobs().get(0).getStatus()).isEqualTo(AiJobStatus.COMPLETED);
        assertThat(story.getAiJobs().get(0).getProviderName()).isEqualTo("mock-ai-provider");
        verify(storyRepository).save(story);
    }

    @Test
    void generateTestCasesCarriesAnsweredClarificationsGuidanceAndFocusAreas() {
        Story story = story();
        story.addRequirement(requirement());
        Ambiguity answered = new Ambiguity("Which browsers are supported?", AmbiguitySeverity.MEDIUM);
        answered.resolve("Chrome and Safari must be covered.", "qa");
        Ambiguity open = new Ambiguity("What is the timeout?", AmbiguitySeverity.LOW);
        Ambiguity dismissed = new Ambiguity("Should this cover beta users?", AmbiguitySeverity.LOW);
        dismissed.dismiss("qa");
        story.addAmbiguity(answered);
        story.addAmbiguity(open);
        story.addAmbiguity(dismissed);
        GeneratedTestSuiteResult result = generatedSuiteResult(story.getId());
        when(storyRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(aiGenerationProvider.generateTestCases(any(TestGenerationRequest.class))).thenReturn(result);
        when(aiGenerationProvider.providerName()).thenReturn("mock-ai-provider");
        when(storyRepository.save(story)).thenAnswer(invocation -> {
            assignGeneratedIds(story);
            return story;
        });
        ArgumentCaptor<TestGenerationRequest> captor = ArgumentCaptor.forClass(TestGenerationRequest.class);

        aiGenerationService.generateTestCases(story.getId(), new TestGenerationOptions(
                "Prioritize regression smoke coverage.",
                List.of(FocusArea.ACCESSIBILITY, FocusArea.SECURITY)
        ));

        verify(aiGenerationProvider).generateTestCases(captor.capture());
        TestGenerationRequest request = captor.getValue();
        assertThat(request.clarifications())
                .singleElement()
                .satisfies(clarification -> {
                    assertThat(clarification.question()).isEqualTo("Which browsers are supported?");
                    assertThat(clarification.answer()).isEqualTo("Chrome and Safari must be covered.");
                });
        assertThat(request.guidance()).isEqualTo("Prioritize regression smoke coverage.");
        assertThat(request.focusAreas()).containsExactly(FocusArea.ACCESSIBILITY, FocusArea.SECURITY);
    }

    @Test
    void analyzeStoryPersistsFailedAiJobWhenProviderOutputIsInvalid() {
        Story story = story();
        AiProviderException providerException = new AiProviderException("AI provider output validation failed: requirements is required");
        when(storyRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(aiGenerationProvider.analyzeStory(any(StoryAnalysisRequest.class))).thenThrow(providerException);
        when(aiGenerationProvider.providerName()).thenReturn("openai");
        when(aiGenerationProvider.modelName()).thenReturn("gpt-test");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> aiGenerationService.analyzeStory(story.getId()))
                .isSameAs(providerException);

        assertThat(story.getStatus()).isEqualTo(StoryStatus.DRAFT);
        assertThat(story.getRequirements()).isEmpty();
        assertThat(story.getAiJobs()).hasSize(1);
        assertThat(story.getAiJobs().get(0).getStatus()).isEqualTo(AiJobStatus.FAILED);
        assertThat(story.getAiJobs().get(0).getJobType()).isEqualTo("story-analysis");
        assertThat(story.getAiJobs().get(0).getProviderName()).isEqualTo("openai");
        assertThat(story.getAiJobs().get(0).getModelName()).isEqualTo("gpt-test");
        assertThat(story.getAiJobs().get(0).getErrorMessage()).contains("requirements is required");
        verify(storyRepository).save(story);
    }

    @Test
    void analyzeStoryDoesNotPersistInvalidValidatedOutputAndMarksAiJobFailed() {
        Story story = story();
        StoryAnalysisResult invalidResult = invalidAnalysisResult(story.getId());
        when(storyRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(aiGenerationProvider.analyzeStory(any(StoryAnalysisRequest.class))).thenReturn(invalidResult);
        when(aiGenerationProvider.providerName()).thenReturn("mock-ai-provider");
        when(aiGenerationProvider.modelName()).thenReturn("mock-model");

        assertThatThrownBy(() -> aiGenerationService.analyzeStory(story.getId()))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("AI output validation failed")
                .hasNoCause();

        assertThat(story.getStatus()).isEqualTo(StoryStatus.DRAFT);
        assertThat(story.getRequirements()).isEmpty();
        assertThat(story.getAmbiguities()).isEmpty();
        assertThat(story.getCoverageItems()).isEmpty();
        assertThat(story.getAiJobs()).hasSize(1);
        assertThat(story.getAiJobs().get(0).getStatus()).isEqualTo(AiJobStatus.FAILED);
        assertThat(story.getAiJobs().get(0).getJobType()).isEqualTo("story-analysis");
        assertThat(story.getAiJobs().get(0).getProviderName()).isEqualTo("mock-ai-provider");
        assertThat(story.getAiJobs().get(0).getModelName()).isEqualTo("mock-model");
        assertThat(story.getAiJobs().get(0).getErrorMessage()).contains("REQUIREMENTS_REQUIRED");
        verify(storyRepository).save(story);
    }

    @Test
    void generateTestCasesDoesNotPersistInvalidValidatedOutputAndMarksAiJobFailed() {
        Story story = story();
        story.addRequirement(requirement());
        GeneratedTestSuiteResult invalidResult = invalidGeneratedSuiteResult(story.getId());
        when(storyRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(aiGenerationProvider.generateTestCases(any(TestGenerationRequest.class))).thenReturn(invalidResult);
        when(aiGenerationProvider.providerName()).thenReturn("mock-ai-provider");
        when(aiGenerationProvider.modelName()).thenReturn("mock-model");

        assertThatThrownBy(() -> aiGenerationService.generateTestCases(story.getId()))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("AI output validation failed")
                .hasNoCause();

        assertThat(story.getStatus()).isEqualTo(StoryStatus.DRAFT);
        assertThat(story.getTestSuites()).isEmpty();
        assertThat(story.getAiJobs()).hasSize(1);
        assertThat(story.getAiJobs().get(0).getStatus()).isEqualTo(AiJobStatus.FAILED);
        assertThat(story.getAiJobs().get(0).getJobType()).isEqualTo("test-generation");
        assertThat(story.getAiJobs().get(0).getProviderName()).isEqualTo("mock-ai-provider");
        assertThat(story.getAiJobs().get(0).getModelName()).isEqualTo("mock-model");
        assertThat(story.getAiJobs().get(0).getErrorMessage()).contains("TEST_SUITE_NAME_REQUIRED");
        verify(storyRepository).save(story);
    }

    @Test
    void getTestSuitesReturnsPersistedIdsAndReviewStatus() {
        Story story = story();
        story.addRequirement(requirement());
        TestSuite testSuite = new TestSuite("Persisted Regression Suite");
        TestCase testCase = new TestCase("Complete primary workflow successfully", TestCaseType.FUNCTIONAL);
        testCase.setDescription("Covers the happy path.");
        testCase.setTestLayer(TestLayer.UI);
        testCase.setPriority(Priority.HIGH);
        testCase.setRiskLevel(RiskLevel.MEDIUM);
        testCase.setReviewStatus(ReviewStatus.NEEDS_REVIEW);
        testCase.setAutomationCandidate(true);
        testCase.addStep(new TestStep(1, "Submit valid data.", "The workflow succeeds."));
        testCase.addTestData(new TestData("validInput", "{\"state\":\"valid\"}"));
        testSuite.addTestCase(testCase);
        story.addTestSuite(testSuite);
        assignGeneratedIds(story);

        when(storyRepository.findById(story.getId())).thenReturn(Optional.of(story));

        List<GeneratedTestSuiteResult> response = aiGenerationService.getTestSuites(story.getId());

        assertThat(response).hasSize(1);
        GeneratedTestSuiteResult suiteResponse = response.get(0);
        assertThat(suiteResponse.id()).isEqualTo(testSuite.getId());
        assertThat(suiteResponse.testCases()).hasSize(1);
        assertThat(suiteResponse.testCases().get(0).id()).isEqualTo(testCase.getId());
        assertThat(suiteResponse.testCases().get(0).reviewStatus()).isEqualTo(ReviewStatus.NEEDS_REVIEW);
        assertThat(suiteResponse.testCases().get(0).steps().get(0).id()).isEqualTo(testCase.getTestSteps().get(0).getId());
        assertThat(suiteResponse.testCases().get(0).testData().get(0).id()).isEqualTo(testCase.getTestDataEntries().get(0).getId());
    }

    @Test
    void regenerateTestCaseKeepsIdAndReviewStatusReplacesStepsRecomputesScoreAndRecordsSnapshots() throws Exception {
        Story story = story();
        Ambiguity answered = new Ambiguity("Which decline codes are in scope?", AmbiguitySeverity.MEDIUM);
        answered.resolve("Use insufficient funds and expired card.", "qa");
        story.addAmbiguity(answered);
        TestSuite suite = new TestSuite("Checkout suite");
        TestCase testCase = new TestCase("Card declined", TestCaseType.NEGATIVE);
        ReflectionTestUtils.setField(testCase, "id", UUID.randomUUID());
        testCase.setDescription("Old decline path.");
        testCase.setTestLayer(TestLayer.UI);
        testCase.setPriority(Priority.MEDIUM);
        testCase.setRiskLevel(RiskLevel.MEDIUM);
        testCase.setReviewStatus(ReviewStatus.NEEDS_CLARIFICATION);
        testCase.setExpectedResult("Given a declined payment");
        testCase.setQualityScore(31);
        testCase.addStep(new TestStep(1, "Submit an expired card.", "A generic error appears."));
        testCase.addTestData(new TestData("oldCard", "{\"state\":\"expired\"}"));
        suite.addTestCase(testCase);
        story.addTestSuite(suite);
        GeneratedTestCaseDto regenerated = new GeneratedTestCaseDto(
                "Card declined (revised: issuer response)",
                "Covers issuer-specific decline messaging.",
                TestCaseType.NEGATIVE,
                TestLayer.UI,
                Priority.HIGH,
                RiskLevel.HIGH,
                true,
                0.92,
                "Given issuer decline details are available",
                List.of("REQ-1"),
                List.of(
                        new GeneratedTestStepDto(1, "Submit a card declined for insufficient funds.", "The issuer decline reason is displayed."),
                        new GeneratedTestStepDto(2, "Retry with an expired card.", "The expired-card correction is displayed.")
                ),
                List.of(new GeneratedTestDataDto("declinedCards", "{\"codes\":[\"insufficient_funds\",\"expired_card\"]}")),
                "Reviewer requested issuer-specific decline coverage.",
                "Declined payments show actionable reasons"
        );
        when(testCaseRepository.findById(testCase.getId())).thenReturn(Optional.of(testCase));
        when(aiGenerationProvider.regenerateTestCase(any(RegenerateContext.class))).thenReturn(regenerated);
        when(testCaseRepository.save(testCase)).thenReturn(testCase);
        ArgumentCaptor<RegenerateContext> contextCaptor = ArgumentCaptor.forClass(RegenerateContext.class);

        var response = aiGenerationService.regenerateTestCase(
                testCase.getId(),
                "Issuer response is unclear.",
                "qa-reviewer"
        );

        assertThat(response.id()).isEqualTo(testCase.getId());
        assertThat(response.reviewStatus()).isEqualTo(ReviewStatus.NEEDS_CLARIFICATION);
        assertThat(response.title()).isEqualTo("Card declined (revised: issuer response)");
        assertThat(response.steps()).hasSize(2);
        assertThat(response.steps().get(0).action()).contains("insufficient funds");
        assertThat(testCase.getTestDataEntries()).singleElement()
                .satisfies(testData -> assertThat(testData.getName()).isEqualTo("declinedCards"));
        assertThat(testCase.getQualityScore()).isGreaterThan(31);
        assertThat(testCase.getConfidenceLevel()).isNotNull();
        assertThat(testCase.getReviewEvents()).singleElement().satisfies(event -> {
            assertThat(event.getActionType()).isEqualTo("REGENERATED");
            assertThat(event.getReviewer()).isEqualTo("qa-reviewer");
            assertThat(event.getComment()).isEqualTo("Issuer response is unclear.");
            JsonNode before = readJson(event.getPreviousValue());
            JsonNode after = readJson(event.getNewValue());
            assertThat(before.get("title").asText()).isEqualTo("Card declined");
            assertThat(after.get("title").asText()).isEqualTo("Card declined (revised: issuer response)");
            assertThat(before.get("steps")).hasSize(1);
            assertThat(after.get("steps")).hasSize(2);
        });
        verify(aiGenerationProvider).regenerateTestCase(contextCaptor.capture());
        assertThat(contextCaptor.getValue().testCaseId()).isEqualTo(testCase.getId());
        assertThat(contextCaptor.getValue().clarifications()).singleElement()
                .satisfies(clarification -> assertThat(clarification.answer()).contains("insufficient funds"));
        verify(testCaseRepository).save(testCase);
    }

    private Story story() {
        Project project = new Project("Platform", "platform");
        Story story = new Story("Create project", StoryType.USER_STORY);
        story.setStoryText("As a QA lead, I want to create a project.");
        ReflectionTestUtils.setField(story, "id", UUID.randomUUID());
        project.addStory(story);
        return story;
    }

    private com.testcaseiq.api.domain.model.Requirement requirement() {
        com.testcaseiq.api.domain.model.Requirement requirement =
                new com.testcaseiq.api.domain.model.Requirement("Primary user goal", RequirementType.FUNCTIONAL);
        requirement.setSourceReference("REQ-1");
        requirement.setPriority(Priority.HIGH);
        requirement.setRiskLevel(RiskLevel.MEDIUM);
        return requirement;
    }

    private StoryAnalysisResult analysisResult(UUID storyId) {
        ExtractedRequirementDto requirement = new ExtractedRequirementDto(
                "REQ-1",
                "Primary user goal",
                "User can complete the workflow.",
                RequirementType.FUNCTIONAL,
                Priority.HIGH,
                RiskLevel.MEDIUM
        );
        return new StoryAnalysisResult(
                storyId,
                "QA lead",
                "create a project",
                new RequirementExtractionResult(List.of(requirement), List.of()),
                new AmbiguityDetectionResult(List.of(new ExtractedAmbiguityDto(
                        "What fields are required?",
                        "The story does not define required fields.",
                        AmbiguitySeverity.MEDIUM
                ))),
                new CoveragePlanResult(List.of(new CoverageItemDto(
                        "REQ-1",
                        CoverageCategory.HAPPY_PATH,
                        "Verify the primary path.",
                        RiskLevel.MEDIUM
                ))),
                new QaValidationResult(0.8, 0.9, List.of()),
                "mock-ai-provider",
                null
        );
    }

    private StoryAnalysisResult invalidAnalysisResult(UUID storyId) {
        return new StoryAnalysisResult(
                storyId,
                "QA lead",
                "create a project",
                new RequirementExtractionResult(List.of(), List.of()),
                new AmbiguityDetectionResult(List.of()),
                new CoveragePlanResult(List.of()),
                new QaValidationResult(0.8, 0.9, List.of()),
                "mock-ai-provider",
                null
        );
    }

    private GeneratedTestSuiteResult generatedSuiteResult(UUID storyId) {
        return new GeneratedTestSuiteResult(
                storyId,
                "Mock AI Regression Suite",
                List.of(new GeneratedTestCaseDto(
                        "Complete primary workflow successfully",
                        "Covers the happy path.",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.UI,
                        Priority.HIGH,
                        RiskLevel.MEDIUM,
                        true,
                        0.9,
                        "Given a valid user",
                        List.of("REQ-1"),
                        List.of(new GeneratedTestStepDto(1, "Submit valid data.", "The workflow succeeds.")),
                        List.of(new GeneratedTestDataDto("validInput", "{\"state\":\"valid\"}")),
                        null,
                        null
                )),
                new QaValidationResult(0.8, 0.9, List.of()),
                "mock-ai-provider",
                null
        );
    }

    private GeneratedTestSuiteResult invalidGeneratedSuiteResult(UUID storyId) {
        return new GeneratedTestSuiteResult(
                storyId,
                " ",
                List.of(),
                new QaValidationResult(0.8, 0.9, List.of()),
                "mock-ai-provider",
                null
        );
    }

    private void assignGeneratedIds(Story story) {
        story.getTestSuites().forEach(testSuite -> {
            ReflectionTestUtils.setField(testSuite, "id", UUID.randomUUID());
            testSuite.getTestCases().forEach(testCase -> {
                ReflectionTestUtils.setField(testCase, "id", UUID.randomUUID());
                testCase.getTestSteps().forEach(testStep ->
                        ReflectionTestUtils.setField(testStep, "id", UUID.randomUUID()));
                testCase.getTestDataEntries().forEach(testData ->
                        ReflectionTestUtils.setField(testData, "id", UUID.randomUUID()));
            });
        });
    }

    private JsonNode readJson(String value) {
        try {
            return new ObjectMapper().readTree(value);
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }
}
