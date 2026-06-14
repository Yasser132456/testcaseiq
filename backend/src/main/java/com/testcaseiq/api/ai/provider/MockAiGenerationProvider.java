package com.testcaseiq.api.ai.provider;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

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
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;
import com.testcaseiq.api.domain.enums.CoverageCategory;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;

public class MockAiGenerationProvider implements AiGenerationProvider {

    private static final String PROVIDER_NAME = "mock-ai-provider";

    @Override
    public String providerName() {
        return PROVIDER_NAME;
    }

    @Override
    public StoryAnalysisResult analyzeStory(StoryAnalysisRequest request) {
        String rawText = safe(request.rawText());
        String lowerText = rawText.toLowerCase(Locale.ROOT);
        String actor = extractActor(rawText);
        String goal = extractGoal(rawText);
        List<String> acceptanceCriteria = extractAcceptanceCriteria(rawText);

        List<ExtractedRequirementDto> requirements = new ArrayList<>();
        requirements.add(new ExtractedRequirementDto(
                "REQ-1",
                "Primary user goal",
                actor + " can " + goal + ".",
                RequirementType.FUNCTIONAL,
                Priority.HIGH,
                RiskLevel.MEDIUM
        ));
        requirements.add(new ExtractedRequirementDto(
                "REQ-2",
                "Validation and feedback",
                "The system provides clear feedback for invalid or incomplete inputs.",
                RequirementType.ACCEPTANCE_CRITERION,
                Priority.MEDIUM,
                RiskLevel.MEDIUM
        ));
        if (lowerText.contains("role") || lowerText.contains("permission") || lowerText.contains("admin")) {
            requirements.add(new ExtractedRequirementDto(
                    "REQ-3",
                    "Role-based access",
                    "Access to the workflow respects the user's role and permissions.",
                    RequirementType.ROLE_PERMISSION,
                    Priority.HIGH,
                    RiskLevel.HIGH
            ));
        }

        List<ExtractedAmbiguityDto> ambiguities = new ArrayList<>();
        if (!lowerText.contains("given") && !lowerText.contains("acceptance")) {
            ambiguities.add(new ExtractedAmbiguityDto(
                    "What acceptance criteria define a successful outcome?",
                    "The story text does not contain explicit acceptance criteria.",
                    AmbiguitySeverity.MEDIUM
            ));
        }
        ambiguities.add(new ExtractedAmbiguityDto(
                "Which error states must be shown to the user?",
                "Negative and validation paths should be confirmed before implementation.",
                AmbiguitySeverity.LOW
        ));

        List<CoverageItemDto> coverageItems = List.of(
                new CoverageItemDto("REQ-1", CoverageCategory.HAPPY_PATH, "Verify the primary successful workflow.", RiskLevel.MEDIUM),
                new CoverageItemDto("REQ-2", CoverageCategory.NEGATIVE_PATH, "Verify validation feedback for missing or invalid inputs.", RiskLevel.MEDIUM),
                new CoverageItemDto("REQ-2", CoverageCategory.BOUNDARY, "Verify boundary values and empty input behavior.", RiskLevel.LOW)
        );

        QaValidationResult qaValidation = new QaValidationResult(
                acceptanceCriteria.isEmpty() ? 0.72 : 0.86,
                ambiguities.size() > 1 ? 0.74 : 0.88,
                acceptanceCriteria.isEmpty()
                        ? List.of("Add explicit acceptance criteria before final test generation.")
                        : List.of()
        );

        return new StoryAnalysisResult(
                request.storyId(),
                actor,
                goal,
                new RequirementExtractionResult(requirements, acceptanceCriteria),
                new AmbiguityDetectionResult(ambiguities),
                new CoveragePlanResult(coverageItems),
                qaValidation,
                PROVIDER_NAME,
                Instant.now()
        );
    }

    @Override
    public GeneratedTestSuiteResult generateTestCases(TestGenerationRequest request) {
        List<ExtractedRequirementDto> requirements = request.requirements() == null ? List.of() : request.requirements();
        List<String> requirementReferences = requirements.stream()
                .map(ExtractedRequirementDto::reference)
                .filter(reference -> reference != null && !reference.isBlank())
                .toList();
        List<String> linkedReferences = requirementReferences.isEmpty() ? List.of("REQ-1") : requirementReferences;

        List<GeneratedTestCaseDto> testCases = List.of(
                new GeneratedTestCaseDto(
                        "Complete primary workflow successfully",
                        "Manual functional test covering the core story outcome.",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.UI,
                        Priority.HIGH,
                        RiskLevel.MEDIUM,
                        true,
                        0.91,
                        "Given a valid user context\nWhen the user completes the workflow\nThen the expected outcome is shown",
                        linkedReferences,
                        List.of(
                                new GeneratedTestStepDto(1, "Open the feature workspace.", "The workspace loads without errors."),
                                new GeneratedTestStepDto(2, "Enter valid inputs for the story workflow.", "The inputs are accepted."),
                                new GeneratedTestStepDto(3, "Submit the workflow.", "The system confirms the successful outcome.")
                        ),
                        List.of(new GeneratedTestDataDto("validUserInput", "{\"state\":\"valid\",\"role\":\"standard-user\"}"))
                ),
                new GeneratedTestCaseDto(
                        "Reject incomplete required input",
                        "Negative test covering missing mandatory information.",
                        TestCaseType.NEGATIVE,
                        TestLayer.UI,
                        Priority.MEDIUM,
                        RiskLevel.MEDIUM,
                        true,
                        0.88,
                        "Given required fields are missing\nWhen the user submits the workflow\nThen validation messages are displayed",
                        linkedReferences,
                        List.of(
                                new GeneratedTestStepDto(1, "Open the feature workspace.", "The workspace loads without errors."),
                                new GeneratedTestStepDto(2, "Leave required inputs empty.", "The form remains editable."),
                                new GeneratedTestStepDto(3, "Submit the workflow.", "Validation feedback identifies the missing inputs.")
                        ),
                        List.of(new GeneratedTestDataDto("missingRequiredInput", "{\"state\":\"invalid\",\"missingFields\":true}"))
                ),
                new GeneratedTestCaseDto(
                        "Handle boundary-length input",
                        "Boundary test for minimum and maximum supported text input.",
                        TestCaseType.BOUNDARY,
                        TestLayer.UI,
                        Priority.MEDIUM,
                        RiskLevel.LOW,
                        false,
                        0.82,
                        "Given boundary-length data\nWhen the workflow is submitted\nThen the system handles the value consistently",
                        linkedReferences,
                        List.of(
                                new GeneratedTestStepDto(1, "Enter a minimum-length value.", "The value is accepted or rejected according to validation rules."),
                                new GeneratedTestStepDto(2, "Enter a maximum-length value.", "The value is accepted without truncation."),
                                new GeneratedTestStepDto(3, "Submit each boundary case.", "The system response is clear and consistent.")
                        ),
                        List.of(new GeneratedTestDataDto("boundaryInput", "{\"min\":\"a\",\"maxLengthCandidate\":255}"))
                )
        );

        return new GeneratedTestSuiteResult(
                request.storyId(),
                "Mock AI Regression Suite",
                testCases,
                new QaValidationResult(0.84, 0.87, List.of("Review generated edge cases against final acceptance criteria.")),
                PROVIDER_NAME,
                Instant.now()
        );
    }

    private String extractActor(String rawText) {
        String lowerText = rawText.toLowerCase(Locale.ROOT);
        int asIndex = lowerText.indexOf("as a ");
        if (asIndex >= 0) {
            int start = asIndex + 5;
            int end = lowerText.indexOf(",", start);
            if (end < 0) {
                end = lowerText.indexOf(" i want", start);
            }
            if (end > start) {
                return rawText.substring(start, end).trim();
            }
        }
        return "user";
    }

    private String extractGoal(String rawText) {
        String lowerText = rawText.toLowerCase(Locale.ROOT);
        int wantIndex = lowerText.indexOf("i want");
        if (wantIndex >= 0) {
            int start = wantIndex + 6;
            int end = lowerText.indexOf(" so that", start);
            if (end < 0) {
                end = rawText.length();
            }
            return rawText.substring(start, end).trim().replaceAll("[.\\s]+$", "");
        }
        return "complete the requested workflow";
    }

    private List<String> extractAcceptanceCriteria(String rawText) {
        return rawText.lines()
                .map(String::trim)
                .filter(line -> line.toLowerCase(Locale.ROOT).startsWith("given ")
                        || line.toLowerCase(Locale.ROOT).startsWith("when ")
                        || line.toLowerCase(Locale.ROOT).startsWith("then "))
                .toList();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
