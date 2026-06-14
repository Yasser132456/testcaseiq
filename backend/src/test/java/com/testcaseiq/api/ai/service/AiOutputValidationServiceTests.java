package com.testcaseiq.api.ai.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
import com.testcaseiq.api.ai.validation.AiOutputValidationService;
import com.testcaseiq.api.ai.validation.AiValidationIssue;
import com.testcaseiq.api.ai.validation.AiValidationSeverity;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;
import com.testcaseiq.api.domain.enums.CoverageCategory;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;

class AiOutputValidationServiceTests {

    private AiOutputValidationService validationService;

    @BeforeEach
    void setUp() {
        validationService = new AiOutputValidationService();
    }

    @Test
    void validMockLikeAnalysisPasses() {
        var result = validationService.validateStoryAnalysis(validAnalysis());

        assertThat(result.valid()).isTrue();
        assertThat(result.errors()).isEmpty();
        assertThat(result.warnings()).isEmpty();
    }

    @Test
    void missingAmbiguityQuestionFails() {
        StoryAnalysisResult analysis = new StoryAnalysisResult(
                UUID.randomUUID(),
                "QA lead",
                "create a project",
                new RequirementExtractionResult(List.of(requirement()), List.of()),
                new AmbiguityDetectionResult(List.of(new ExtractedAmbiguityDto(
                        " ",
                        "The story does not define required fields.",
                        AmbiguitySeverity.MEDIUM
                ))),
                new CoveragePlanResult(List.of(coverageItem())),
                validQaValidation(),
                "mock-ai-provider",
                Instant.now()
        );

        var result = validationService.validateStoryAnalysis(analysis);

        assertThat(result.valid()).isFalse();
        assertThat(result.errors())
                .extracting(AiValidationIssue::code)
                .contains("AMBIGUITY_QUESTION_REQUIRED");
    }

    @Test
    void invalidScoreFails() {
        StoryAnalysisResult analysis = new StoryAnalysisResult(
                UUID.randomUUID(),
                "QA lead",
                "create a project",
                new RequirementExtractionResult(List.of(requirement()), List.of()),
                new AmbiguityDetectionResult(List.of(new ExtractedAmbiguityDto(
                        "What fields are required?",
                        "The story does not define required fields.",
                        AmbiguitySeverity.MEDIUM
                ))),
                new CoveragePlanResult(List.of(coverageItem())),
                new QaValidationResult(101.0, 90.0, List.of()),
                "mock-ai-provider",
                Instant.now()
        );

        var result = validationService.validateStoryAnalysis(analysis);

        assertThat(result.valid()).isFalse();
        assertThat(result.errors())
                .extracting(AiValidationIssue::code)
                .contains("SCORE_OUT_OF_RANGE");
    }

    @Test
    void validTestGenerationPasses() {
        var result = validationService.validateTestGeneration(validSuite());

        assertThat(result.valid()).isTrue();
        assertThat(result.errors()).isEmpty();
        assertThat(result.warnings()).isEmpty();
    }

    @Test
    void missingExpectedResultFails() {
        GeneratedTestCaseDto testCase = testCase(
                "Complete primary workflow successfully",
                "Covers the happy path.",
                List.of(new GeneratedTestStepDto(1, "Submit valid data.", " "))
        );

        var result = validationService.validateTestGeneration(suite(List.of(testCase)));

        assertThat(result.valid()).isFalse();
        assertThat(result.errors())
                .extracting(AiValidationIssue::code)
                .contains("STEP_EXPECTED_RESULT_REQUIRED");
    }

    @Test
    void duplicateTestCasesFail() {
        GeneratedTestCaseDto first = testCase(
                "Complete primary workflow successfully",
                "Covers the happy path.",
                List.of(new GeneratedTestStepDto(1, "Submit valid data.", "The workflow succeeds."))
        );
        GeneratedTestCaseDto second = testCase(
                " complete   primary workflow successfully ",
                "Covers the happy path.",
                List.of(new GeneratedTestStepDto(1, "Submit valid data.", "The workflow succeeds."))
        );

        var result = validationService.validateTestGeneration(suite(List.of(first, second)));

        assertThat(result.valid()).isFalse();
        assertThat(result.errors())
                .extracting(AiValidationIssue::code)
                .contains("DUPLICATE_TEST_CASE");
    }

    @Test
    void missingTraceabilityCreatesWarning() {
        GeneratedTestCaseDto testCase = new GeneratedTestCaseDto(
                "Complete primary workflow successfully",
                "Covers the happy path.",
                TestCaseType.FUNCTIONAL,
                TestLayer.UI,
                Priority.HIGH,
                RiskLevel.MEDIUM,
                true,
                0.9,
                null,
                List.of(),
                List.of(new GeneratedTestStepDto(1, "Submit valid data.", "The workflow succeeds.")),
                List.of(new GeneratedTestDataDto("validInput", "{\"state\":\"valid\"}"))
        );

        var result = validationService.validateTestGeneration(suite(List.of(testCase)));

        assertThat(result.valid()).isTrue();
        assertThat(result.warnings())
                .extracting(AiValidationIssue::code)
                .contains("TEST_CASE_TRACEABILITY_MISSING");
        assertThat(result.issues())
                .filteredOn(issue -> issue.code().equals("TEST_CASE_TRACEABILITY_MISSING"))
                .extracting(AiValidationIssue::severity)
                .containsOnly(AiValidationSeverity.WARNING);
    }

    private StoryAnalysisResult validAnalysis() {
        return new StoryAnalysisResult(
                UUID.randomUUID(),
                "QA lead",
                "create a project",
                new RequirementExtractionResult(List.of(requirement()), List.of()),
                new AmbiguityDetectionResult(List.of(new ExtractedAmbiguityDto(
                        "What fields are required?",
                        "The story does not define required fields.",
                        AmbiguitySeverity.MEDIUM
                ))),
                new CoveragePlanResult(List.of(coverageItem())),
                validQaValidation(),
                "mock-ai-provider",
                Instant.now()
        );
    }

    private GeneratedTestSuiteResult validSuite() {
        return suite(List.of(testCase(
                "Complete primary workflow successfully",
                "Covers the happy path.",
                List.of(new GeneratedTestStepDto(1, "Submit valid data.", "The workflow succeeds."))
        )));
    }

    private GeneratedTestSuiteResult suite(List<GeneratedTestCaseDto> testCases) {
        return new GeneratedTestSuiteResult(
                UUID.randomUUID(),
                "Mock AI Regression Suite",
                testCases,
                validQaValidation(),
                "mock-ai-provider",
                Instant.now()
        );
    }

    private GeneratedTestCaseDto testCase(String title, String objective, List<GeneratedTestStepDto> steps) {
        return new GeneratedTestCaseDto(
                title,
                objective,
                TestCaseType.FUNCTIONAL,
                TestLayer.UI,
                Priority.HIGH,
                RiskLevel.MEDIUM,
                true,
                0.9,
                "Given a valid user",
                List.of("REQ-1"),
                steps,
                List.of(new GeneratedTestDataDto("validInput", "{\"state\":\"valid\"}"))
        );
    }

    private ExtractedRequirementDto requirement() {
        return new ExtractedRequirementDto(
                "REQ-1",
                "Primary user goal",
                "User can complete the workflow.",
                RequirementType.FUNCTIONAL,
                Priority.HIGH,
                RiskLevel.MEDIUM
        );
    }

    private CoverageItemDto coverageItem() {
        return new CoverageItemDto(
                "REQ-1",
                CoverageCategory.HAPPY_PATH,
                "Verify the primary path.",
                RiskLevel.MEDIUM
        );
    }

    private QaValidationResult validQaValidation() {
        return new QaValidationResult(80.0, 90.0, List.of());
    }
}
