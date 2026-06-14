package com.testcaseiq.api.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
import com.testcaseiq.api.ai.dto.StoryAnalysisRequest;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.dto.TestGenerationRequest;
import com.testcaseiq.api.ai.provider.AiGenerationProvider;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;
import com.testcaseiq.api.domain.enums.CoverageCategory;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;
import com.testcaseiq.api.domain.model.Project;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.repository.AiJobRepository;
import com.testcaseiq.api.domain.repository.StoryRepository;

@ExtendWith(MockitoExtension.class)
class AiGenerationServiceTests {

    @Mock
    private StoryRepository storyRepository;

    @Mock
    private AiJobRepository aiJobRepository;

    @Mock
    private AiGenerationProvider aiGenerationProvider;

    private AiGenerationService aiGenerationService;

    @BeforeEach
    void setUp() {
        aiGenerationService = new AiGenerationService(
                storyRepository,
                aiJobRepository,
                aiGenerationProvider,
                new ObjectMapper()
        );
    }

    @Test
    void analyzeStoryPersistsDomainObjectsAndAiJob() {
        Story story = story();
        StoryAnalysisResult result = analysisResult(story.getId());
        when(storyRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(aiGenerationProvider.analyzeStory(any(StoryAnalysisRequest.class))).thenReturn(result);

        StoryAnalysisResult response = aiGenerationService.analyzeStory(story.getId());

        assertThat(response).isEqualTo(result);
        assertThat(story.getStatus()).isEqualTo(StoryStatus.ANALYZED);
        assertThat(story.getRequirements()).hasSize(1);
        assertThat(story.getAmbiguities()).hasSize(1);
        assertThat(story.getCoverageItems()).hasSize(1);
        assertThat(story.getAiJobs()).hasSize(1);
        assertThat(story.getAiJobs().get(0).getJobType()).isEqualTo("story-analysis");
        verify(storyRepository).save(story);
    }

    @Test
    void generateTestCasesPersistsSuiteCasesStepsDataAndAiJob() {
        Story story = story();
        story.addRequirement(requirement());
        GeneratedTestSuiteResult result = generatedSuiteResult(story.getId());
        when(storyRepository.findById(story.getId())).thenReturn(Optional.of(story));
        when(aiGenerationProvider.generateTestCases(any(TestGenerationRequest.class))).thenReturn(result);

        GeneratedTestSuiteResult response = aiGenerationService.generateTestCases(story.getId());

        assertThat(response).isEqualTo(result);
        assertThat(story.getStatus()).isEqualTo(StoryStatus.TESTS_GENERATED);
        assertThat(story.getTestSuites()).hasSize(1);
        assertThat(story.getTestSuites().get(0).getTestCases()).hasSize(1);
        assertThat(story.getTestSuites().get(0).getTestCases().get(0).getTestSteps()).hasSize(1);
        assertThat(story.getTestSuites().get(0).getTestCases().get(0).getTestDataEntries()).hasSize(1);
        assertThat(story.getAiJobs()).hasSize(1);
        assertThat(story.getAiJobs().get(0).getJobType()).isEqualTo("test-generation");
        verify(storyRepository).save(story);
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
                        List.of(new GeneratedTestDataDto("validInput", "{\"state\":\"valid\"}"))
                )),
                new QaValidationResult(0.8, 0.9, List.of()),
                "mock-ai-provider",
                null
        );
    }
}
