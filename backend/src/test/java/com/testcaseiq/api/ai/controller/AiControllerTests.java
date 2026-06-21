package com.testcaseiq.api.ai.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

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
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.provider.AiProviderException;
import com.testcaseiq.api.ai.provider.AiProviderProperties;
import com.testcaseiq.api.ai.service.AiGenerationService;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;
import com.testcaseiq.api.domain.enums.CoverageCategory;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;

@WebMvcTest(AiController.class)
@AutoConfigureMockMvc(addFilters = false)
class AiControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AiGenerationService aiGenerationService;

    @MockBean
    private AuditService auditService;

    @MockBean
    private AiProviderProperties aiProviderProperties;

    @BeforeEach
    void setupProviderMock() {
        given(aiProviderProperties.getProvider()).willReturn(AiProviderProperties.Provider.MOCK);
    }

    @Test
    void analyzeStoryReturnsAnalysisResult() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(aiGenerationService.analyzeStory(storyId)).thenReturn(analysisResult(storyId));

        mockMvc.perform(post("/api/stories/{storyId}/analyze", storyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.actor").value("QA lead"))
                .andExpect(jsonPath("$.requirements.requirements", hasSize(1)))
                .andExpect(jsonPath("$.coveragePlan.coverageItems", hasSize(1)));
    }

    @Test
    void generateTestsReturnsGeneratedSuite() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(aiGenerationService.generateTestCases(storyId)).thenReturn(generatedSuiteResult(storyId));

        mockMvc.perform(post("/api/stories/{storyId}/generate-tests", storyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.suiteName").value("Mock AI Regression Suite"))
                .andExpect(jsonPath("$.testCases", hasSize(1)))
                .andExpect(jsonPath("$.testCases[0].id").exists())
                .andExpect(jsonPath("$.testCases[0].reviewStatus").value("NEEDS_REVIEW"))
                .andExpect(jsonPath("$.testCases[0].steps[0].id").exists())
                .andExpect(jsonPath("$.testCases[0].testData[0].id").exists())
                .andExpect(jsonPath("$.testCases[0].steps", hasSize(1)));
    }

    @Test
    void getAnalysisReturnsStoredAnalysis() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(aiGenerationService.getAnalysis(storyId)).thenReturn(analysisResult(storyId));

        mockMvc.perform(get("/api/stories/{storyId}/analysis", storyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("mock-ai-provider"));
    }

    @Test
    void getTestSuitesReturnsStoredSuites() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(aiGenerationService.getTestSuites(storyId)).thenReturn(List.of(generatedSuiteResult(storyId)));

        mockMvc.perform(get("/api/stories/{storyId}/test-suites", storyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].testCases[0].id").exists())
                .andExpect(jsonPath("$[0].testCases[0].reviewStatus").value("NEEDS_REVIEW"))
                .andExpect(jsonPath("$[0].suiteName").value("Mock AI Regression Suite"));
    }

    @Test
    void endpointReturnsNotFoundWhenStoryDoesNotExist() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(aiGenerationService.analyzeStory(storyId)).thenThrow(new ResourceNotFoundException("Story not found: " + storyId));

        mockMvc.perform(post("/api/stories/{storyId}/analyze", storyId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Story not found: " + storyId));
    }

    @Test
    void endpointReturnsBadGatewayWhenAiProviderFailsValidation() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(aiGenerationService.analyzeStory(storyId))
                .thenThrow(new AiProviderException("AI provider output validation failed: requirements is required"));

        mockMvc.perform(post("/api/stories/{storyId}/analyze", storyId))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("AI provider output validation failed: requirements is required"))
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist());
    }

    @Test
    void endpointReturnsCleanErrorWhenAiOutputValidationFails() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(aiGenerationService.generateTestCases(storyId))
                .thenThrow(new AiProviderException("AI output validation failed: TEST_SUITE_NAME_REQUIRED at suiteName"));

        mockMvc.perform(post("/api/stories/{storyId}/generate-tests", storyId))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.message").value("AI output validation failed: TEST_SUITE_NAME_REQUIRED at suiteName"))
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(jsonPath("$.exception").doesNotExist());
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
                UUID.randomUUID(),
                storyId,
                "Mock AI Regression Suite",
                List.of(new GeneratedTestCaseDto(
                        UUID.randomUUID(),
                        "Complete primary workflow successfully",
                        "Covers the happy path.",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.UI,
                        Priority.HIGH,
                        RiskLevel.MEDIUM,
                        ReviewStatus.NEEDS_REVIEW,
                        true,
                        0.9,
                        "Given a valid user",
                        List.of("REQ-1"),
                        List.of(new GeneratedTestStepDto(UUID.randomUUID(), 1, "Submit valid data.", "The workflow succeeds.")),
                        List.of(new GeneratedTestDataDto(UUID.randomUUID(), "validInput", "{\"state\":\"valid\"}")),
                        95,
                        null,
                        "Covers core acceptance criterion.",
                        "Given a valid user, When valid data submitted, Then workflow succeeds."
                )),
                new QaValidationResult(0.8, 0.9, List.of()),
                "mock-ai-provider",
                null,
                "1 test case(s) scored: 1 HIGH confidence, 0 MEDIUM, 0 LOW. Average quality score: 95/100."
        );
    }
}
