package com.testcaseiq.api.ai.provider;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

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
import com.testcaseiq.api.domain.enums.FocusArea;
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
        String title = safe(request.title()).isBlank() ? "Untitled story" : request.title().trim();
        String rawText = safe(request.rawText());
        String lowerText = rawText.toLowerCase(Locale.ROOT);
        String actor = extractActor(rawText);
        String goal = extractGoal(rawText);
        List<String> acceptanceCriteria = extractAcceptanceCriteria(rawText);
        String primaryCriterion = acceptanceCriteria.isEmpty()
                ? "the primary workflow succeeds with clear user feedback"
                : acceptanceCriteria.getFirst();
        String secondaryCriterion = acceptanceCriteria.size() > 1 ? acceptanceCriteria.get(1) : primaryCriterion;

        List<ExtractedRequirementDto> requirements = new ArrayList<>();
        requirements.add(new ExtractedRequirementDto(
                "REQ-1",
                "Primary user goal",
                actor + " can " + normalizeGoal(goal) + " for \"" + title + "\"; acceptance criterion: " + primaryCriterion + ".",
                RequirementType.FUNCTIONAL,
                Priority.HIGH,
                RiskLevel.MEDIUM
        ));
        requirements.add(new ExtractedRequirementDto(
                "REQ-2",
                "Validation and feedback",
                "The system gives clear feedback for \"" + title + "\" when this criterion is not met: " + secondaryCriterion + ".",
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
                new CoverageItemDto("REQ-1", CoverageCategory.HAPPY_PATH, "Verify " + title + " succeeds when " + primaryCriterion + ".", RiskLevel.MEDIUM),
                new CoverageItemDto("REQ-2", CoverageCategory.NEGATIVE_PATH, "Verify " + title + " gives actionable feedback when " + secondaryCriterion + ".", RiskLevel.MEDIUM),
                new CoverageItemDto("REQ-2", CoverageCategory.BOUNDARY, "Verify " + title + " handles limits around " + secondaryCriterion + ".", RiskLevel.LOW)
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
                deterministicInstant(request.storyId())
        );
    }

    @Override
    public GeneratedTestSuiteResult generateTestCases(TestGenerationRequest request) {
        String title = safe(request.title()).isBlank() ? "Untitled story" : request.title().trim();
        String rawText = safe(request.rawText());
        String actor = extractActor(rawText);
        String goal = normalizeGoal(extractGoal(rawText));
        List<String> criteria = extractAcceptanceCriteria(rawText);
        String primaryCriterion = criteria.isEmpty() ? "the primary workflow succeeds" : criteria.getFirst();
        String secondaryCriterion = criteria.size() > 1 ? criteria.get(1) : "required inputs are missing or invalid";
        String boundaryCriterion = criteria.size() > 2 ? criteria.get(2) : "the workflow reaches a boundary condition";
        List<ExtractedRequirementDto> requirements = request.requirements() == null ? List.of() : request.requirements();
        List<String> requirementReferences = requirements.stream()
                .map(ExtractedRequirementDto::reference)
                .filter(reference -> reference != null && !reference.isBlank())
                .toList();
        List<String> linkedReferences = requirementReferences.isEmpty() ? List.of("REQ-1") : requirementReferences;

        List<GeneratedTestCaseDto> testCases = new ArrayList<>(List.of(
                new GeneratedTestCaseDto(
                        "Complete primary workflow successfully",
                        "Manual functional test covering \"" + title + "\" for " + actor + ".",
                        TestCaseType.FUNCTIONAL,
                        TestLayer.UI,
                        Priority.HIGH,
                        RiskLevel.MEDIUM,
                        true,
                        0.91,
                        "Given " + primaryCriterion + "\nWhen " + actor + " " + goal + "\nThen \"" + title + "\" completes successfully",
                        linkedReferences,
                        List.of(
                                new GeneratedTestStepDto(1, "Open the \"" + title + "\" workspace.", "The workspace loads without errors."),
                                new GeneratedTestStepDto(2, "Enter valid story data that satisfies: " + primaryCriterion + ".", "The inputs are accepted."),
                                new GeneratedTestStepDto(3, "Submit the \"" + title + "\" workflow.", "The system confirms the successful outcome.")
                        ),
                        List.of(new GeneratedTestDataDto("validStoryInput", "{\"story\":\"" + jsonEscape(title) + "\",\"state\":\"valid\"}")),
                        "Covers the story-specific happy path for \"" + title + "\".",
                        primaryCriterion
                ),
                new GeneratedTestCaseDto(
                        "Reject incomplete required input",
                        "Negative test covering the validation path for \"" + title + "\".",
                        TestCaseType.NEGATIVE,
                        TestLayer.UI,
                        Priority.MEDIUM,
                        RiskLevel.MEDIUM,
                        true,
                        0.88,
                        "Given " + secondaryCriterion + "\nWhen " + actor + " submits incomplete information\nThen validation messages explain the correction",
                        linkedReferences,
                        List.of(
                                new GeneratedTestStepDto(1, "Open the \"" + title + "\" workspace.", "The workspace loads without errors."),
                                new GeneratedTestStepDto(2, "Leave the data for \"" + secondaryCriterion + "\" incomplete.", "The form remains editable."),
                                new GeneratedTestStepDto(3, reviewerStep(rawText, title), "Validation feedback identifies the missing or invalid inputs.")
                        ),
                        List.of(new GeneratedTestDataDto("invalidStoryInput", "{\"story\":\"" + jsonEscape(title) + "\",\"state\":\"invalid\"}")),
                        "Targets the story-specific validation path from REQ-2.",
                        secondaryCriterion
                ),
                new GeneratedTestCaseDto(
                        "Handle boundary-length input",
                        "Boundary test for the riskiest edge condition in \"" + title + "\".",
                        TestCaseType.BOUNDARY,
                        TestLayer.UI,
                        Priority.MEDIUM,
                        RiskLevel.LOW,
                        false,
                        0.82,
                        "Given " + boundaryCriterion + "\nWhen " + actor + " reaches that edge case\nThen the system handles the value consistently",
                        linkedReferences,
                        List.of(
                                new GeneratedTestStepDto(1, "Prepare boundary data for \"" + title + "\".", "The edge-case fixture is available."),
                                new GeneratedTestStepDto(2, "Submit data around: " + boundaryCriterion + ".", "The value is accepted or rejected according to the story rule."),
                                new GeneratedTestStepDto(3, "Compare the response with adjacent valid data.", "The system response is clear and consistent.")
                        ),
                        List.of(new GeneratedTestDataDto("boundaryStoryInput", "{\"story\":\"" + jsonEscape(title) + "\",\"boundary\":\"" + jsonEscape(boundaryCriterion) + "\"}")),
                        "Addresses the boundary coverage gap from the story acceptance criteria.",
                        boundaryCriterion
                )
        ));
        List<FocusArea> focusAreas = request.focusAreas() == null ? List.of() : request.focusAreas();
        focusAreas.forEach(focusArea -> testCases.add(focusTestCase(focusArea, title, actor, goal, linkedReferences)));

        return new GeneratedTestSuiteResult(
                request.storyId(),
                "Mock AI Regression Suite",
                suiteDescription(request.guidance()),
                focusAreas,
                testCases,
                new QaValidationResult(0.84, 0.87, List.of("Review generated edge cases against final acceptance criteria.")),
                PROVIDER_NAME,
                deterministicInstant(request.storyId())
        );
    }

    private GeneratedTestCaseDto focusTestCase(
            FocusArea focusArea,
            String title,
            String actor,
            String goal,
            List<String> linkedReferences
    ) {
        String focusLabel = focusArea.name();
        return new GeneratedTestCaseDto(
                "[" + focusLabel + "] " + title,
                "Focused manual test for " + focusLabel.toLowerCase(Locale.ROOT) + " coverage in \"" + title + "\".",
                focusType(focusArea),
                focusLayer(focusArea),
                Priority.MEDIUM,
                focusRisk(focusArea),
                focusArea == FocusArea.PERFORMANCE || focusArea == FocusArea.SECURITY,
                0.8,
                "Given " + actor + " is exercising \"" + title + "\"\nWhen they " + goal + " with " + focusLabel.toLowerCase(Locale.ROOT) + " concerns in scope\nThen the " + focusLabel.toLowerCase(Locale.ROOT) + " expectation is verified",
                linkedReferences,
                List.of(
                        new GeneratedTestStepDto(1, "Prepare " + focusLabel.toLowerCase(Locale.ROOT) + " test conditions for \"" + title + "\".", "The focused test context is ready."),
                        new GeneratedTestStepDto(2, "Execute the workflow while observing " + focusLabel.toLowerCase(Locale.ROOT) + " behavior.", "The behavior is visible and reviewable."),
                        new GeneratedTestStepDto(3, "Record whether the " + focusLabel.toLowerCase(Locale.ROOT) + " expectation is met.", "The result can be traced to the selected focus area.")
                ),
                List.of(new GeneratedTestDataDto(
                        focusLabel.toLowerCase(Locale.ROOT) + "FocusInput",
                        "{\"story\":\"" + jsonEscape(title) + "\",\"focusArea\":\"" + focusLabel + "\"}"
                )),
                "Added because " + focusLabel + " was selected as a generation focus area.",
                focusLabel + " focus"
        );
    }

    private TestCaseType focusType(FocusArea focusArea) {
        return switch (focusArea) {
            case NEGATIVE -> TestCaseType.NEGATIVE;
            case BOUNDARY -> TestCaseType.BOUNDARY;
            case ACCESSIBILITY -> TestCaseType.ACCESSIBILITY;
            case PERFORMANCE -> TestCaseType.PERFORMANCE;
            case SECURITY -> TestCaseType.SECURITY;
            case MOBILE -> TestCaseType.FUNCTIONAL;
        };
    }

    private TestLayer focusLayer(FocusArea focusArea) {
        return focusArea == FocusArea.SECURITY || focusArea == FocusArea.PERFORMANCE ? TestLayer.API : TestLayer.UI;
    }

    private RiskLevel focusRisk(FocusArea focusArea) {
        return focusArea == FocusArea.SECURITY || focusArea == FocusArea.PERFORMANCE ? RiskLevel.HIGH : RiskLevel.MEDIUM;
    }

    private String suiteDescription(String guidance) {
        String trimmedGuidance = safe(guidance).trim();
        if (trimmedGuidance.isBlank()) {
            return "Generated by " + PROVIDER_NAME + ".";
        }
        return "Generated by " + PROVIDER_NAME + ". Guidance: " + trimmedGuidance;
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

    private String normalizeGoal(String goal) {
        String normalized = goal == null ? "" : goal.trim();
        if (normalized.toLowerCase(Locale.ROOT).startsWith("to ")) {
            normalized = normalized.substring(3).trim();
        }
        return normalized.isBlank() ? "complete the requested workflow" : normalized;
    }

    private List<String> extractAcceptanceCriteria(String rawText) {
        return rawText.lines()
                .map(String::trim)
                .map(this::normalizeAcceptanceCriterion)
                .filter(line -> !line.isBlank())
                .toList();
    }

    private String normalizeAcceptanceCriterion(String line) {
        String lower = line.toLowerCase(Locale.ROOT);
        if (lower.startsWith("ac:")) {
            return line.substring(3).trim().replaceAll("[.\\s]+$", "");
        }
        if (lower.startsWith("acceptance criterion:")) {
            return line.substring("acceptance criterion:".length()).trim().replaceAll("[.\\s]+$", "");
        }
        if (lower.startsWith("given ") || lower.startsWith("when ") || lower.startsWith("then ")) {
            return line.replaceAll("[.\\s]+$", "");
        }
        return "";
    }

    private String reviewerStep(String rawText, String title) {
        String lower = rawText.toLowerCase(Locale.ROOT);
        if (lower.contains("coordinator") && lower.contains("reason")) {
            return "Record the coordinator and reason while submitting \"" + title + "\".";
        }
        return "Submit the \"" + title + "\" workflow with incomplete required information.";
    }

    private Instant deterministicInstant(UUID storyId) {
        long offset = storyId == null ? 0L : Math.floorMod(storyId.getLeastSignificantBits(), 86_400L);
        return Instant.parse("2026-06-01T09:00:00Z").plusSeconds(offset);
    }

    private String jsonEscape(String value) {
        return safe(value).replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
