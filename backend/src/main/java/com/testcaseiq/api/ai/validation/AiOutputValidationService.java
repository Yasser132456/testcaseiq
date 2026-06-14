package com.testcaseiq.api.ai.validation;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.testcaseiq.api.ai.dto.CoverageItemDto;
import com.testcaseiq.api.ai.dto.ExtractedAmbiguityDto;
import com.testcaseiq.api.ai.dto.GeneratedTestCaseDto;
import com.testcaseiq.api.ai.dto.GeneratedTestStepDto;
import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.QaValidationResult;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;

@Service
public class AiOutputValidationService {

    public StoryAnalysisValidationResult validateStoryAnalysis(StoryAnalysisResult analysis) {
        List<AiValidationIssue> issues = new ArrayList<>();
        if (analysis == null) {
            issues.add(AiValidationIssue.error(
                    "ANALYSIS_RESULT_REQUIRED",
                    "Story analysis result is required.",
                    "$"
            ));
            return new StoryAnalysisValidationResult(issues);
        }

        validateRequirements(analysis, issues);
        validateAmbiguities(analysis, issues);
        validateCoverage(analysis, issues);
        validateQaScores(analysis.qaValidation(), "qaValidation", issues);

        return new StoryAnalysisValidationResult(issues);
    }

    public TestGenerationValidationResult validateTestGeneration(GeneratedTestSuiteResult generation) {
        List<AiValidationIssue> issues = new ArrayList<>();
        if (generation == null) {
            issues.add(AiValidationIssue.error(
                    "TEST_GENERATION_RESULT_REQUIRED",
                    "Test generation result is required.",
                    "$"
            ));
            return new TestGenerationValidationResult(issues);
        }

        if (isBlank(generation.suiteName())) {
            issues.add(AiValidationIssue.error(
                    "TEST_SUITE_NAME_REQUIRED",
                    "Generated test suite name is required.",
                    "suiteName"
            ));
        }

        List<GeneratedTestCaseDto> testCases = generation.testCases() == null ? List.of() : generation.testCases();
        validateTestCases(testCases, issues);
        validateQaScores(generation.qaValidation(), "qaValidation", issues);

        return new TestGenerationValidationResult(issues);
    }

    private void validateRequirements(StoryAnalysisResult analysis, List<AiValidationIssue> issues) {
        boolean hasRequirements = analysis.requirements() != null
                && analysis.requirements().requirements() != null
                && !analysis.requirements().requirements().isEmpty();
        boolean hasAmbiguityExplanation = analysis.ambiguities() != null
                && analysis.ambiguities().ambiguities() != null
                && !analysis.ambiguities().ambiguities().isEmpty();

        if (!hasRequirements && !hasAmbiguityExplanation) {
            issues.add(AiValidationIssue.error(
                    "REQUIREMENTS_REQUIRED",
                    "Story analysis must include requirements unless ambiguities explain missing information.",
                    "requirements.requirements"
            ));
        }
    }

    private void validateAmbiguities(StoryAnalysisResult analysis, List<AiValidationIssue> issues) {
        if (analysis.ambiguities() == null || analysis.ambiguities().ambiguities() == null) {
            return;
        }

        for (int index = 0; index < analysis.ambiguities().ambiguities().size(); index++) {
            ExtractedAmbiguityDto ambiguity = analysis.ambiguities().ambiguities().get(index);
            String path = "ambiguities.ambiguities[" + index + "]";
            if (ambiguity == null) {
                issues.add(AiValidationIssue.error(
                        "AMBIGUITY_REQUIRED",
                        "Ambiguity entry is required.",
                        path
                ));
                continue;
            }
            if (isBlank(ambiguity.question())) {
                issues.add(AiValidationIssue.error(
                        "AMBIGUITY_QUESTION_REQUIRED",
                        "Ambiguity question is required.",
                        path + ".question"
                ));
            }
            if (ambiguity.severity() == null) {
                issues.add(AiValidationIssue.error(
                        "AMBIGUITY_SEVERITY_REQUIRED",
                        "Ambiguity severity is required.",
                        path + ".severity"
                ));
            }
        }
    }

    private void validateCoverage(StoryAnalysisResult analysis, List<AiValidationIssue> issues) {
        if (analysis.coveragePlan() == null || analysis.coveragePlan().coverageItems() == null) {
            return;
        }

        for (int index = 0; index < analysis.coveragePlan().coverageItems().size(); index++) {
            CoverageItemDto coverageItem = analysis.coveragePlan().coverageItems().get(index);
            String path = "coveragePlan.coverageItems[" + index + "]";
            if (coverageItem == null) {
                issues.add(AiValidationIssue.error(
                        "COVERAGE_ITEM_REQUIRED",
                        "Coverage item is required.",
                        path
                ));
                continue;
            }
            if (coverageItem.category() == null) {
                issues.add(AiValidationIssue.error(
                        "COVERAGE_CATEGORY_INVALID",
                        "Coverage item category is required when coverage exists.",
                        path + ".category"
                ));
            }
        }
    }

    private void validateTestCases(List<GeneratedTestCaseDto> testCases, List<AiValidationIssue> issues) {
        Set<String> normalizedTitlesAndObjectives = new HashSet<>();

        for (int index = 0; index < testCases.size(); index++) {
            GeneratedTestCaseDto testCase = testCases.get(index);
            String path = "testCases[" + index + "]";
            if (testCase == null) {
                issues.add(AiValidationIssue.error(
                        "TEST_CASE_REQUIRED",
                        "Test case entry is required.",
                        path
                ));
                continue;
            }

            validateTestCaseRequiredFields(testCase, path, issues);
            validateTestCaseEnums(testCase, path, issues);
            validateTestCaseSteps(testCase, path, issues);
            validateTraceability(testCase, path, issues);
            validateDuplicateTestCase(testCase, normalizedTitlesAndObjectives, path, issues);
        }
    }

    private void validateTestCaseRequiredFields(
            GeneratedTestCaseDto testCase,
            String path,
            List<AiValidationIssue> issues
    ) {
        if (isBlank(testCase.title())) {
            issues.add(AiValidationIssue.error(
                    "TEST_CASE_TITLE_REQUIRED",
                    "Test case title is required.",
                    path + ".title"
            ));
        }
        if (isBlank(testCase.description())) {
            issues.add(AiValidationIssue.error(
                    "TEST_CASE_OBJECTIVE_REQUIRED",
                    "Test case objective is required.",
                    path + ".description"
            ));
        }
    }

    private void validateTestCaseEnums(GeneratedTestCaseDto testCase, String path, List<AiValidationIssue> issues) {
        if (testCase.priority() == null) {
            issues.add(AiValidationIssue.error(
                    "TEST_CASE_PRIORITY_INVALID",
                    "Test case priority is required when present in generated output.",
                    path + ".priority"
            ));
        }
        if (testCase.riskLevel() == null) {
            issues.add(AiValidationIssue.error(
                    "TEST_CASE_RISK_INVALID",
                    "Test case risk level is required when present in generated output.",
                    path + ".riskLevel"
            ));
        }
        if (testCase.testLayer() == null) {
            issues.add(AiValidationIssue.error(
                    "TEST_CASE_LAYER_INVALID",
                    "Test case layer is required when present in generated output.",
                    path + ".testLayer"
            ));
        }
        if (testCase.type() == null) {
            issues.add(AiValidationIssue.error(
                    "TEST_CASE_TYPE_INVALID",
                    "Test case type is required when present in generated output.",
                    path + ".type"
            ));
        }
    }

    private void validateTestCaseSteps(GeneratedTestCaseDto testCase, String path, List<AiValidationIssue> issues) {
        List<GeneratedTestStepDto> steps = testCase.steps() == null ? List.of() : testCase.steps();
        if (steps.isEmpty()) {
            issues.add(AiValidationIssue.error(
                    "TEST_CASE_STEPS_REQUIRED",
                    "Executable or manual test case must include steps.",
                    path + ".steps"
            ));
            return;
        }

        for (int stepIndex = 0; stepIndex < steps.size(); stepIndex++) {
            GeneratedTestStepDto step = steps.get(stepIndex);
            String stepPath = path + ".steps[" + stepIndex + "]";
            if (step == null) {
                issues.add(AiValidationIssue.error(
                        "TEST_STEP_REQUIRED",
                        "Test step entry is required.",
                        stepPath
                ));
                continue;
            }
            if (isBlank(step.expectedResult())) {
                issues.add(AiValidationIssue.error(
                        "STEP_EXPECTED_RESULT_REQUIRED",
                        "Test step expected result is required.",
                        stepPath + ".expectedResult"
                ));
            }
        }
    }

    private void validateTraceability(GeneratedTestCaseDto testCase, String path, List<AiValidationIssue> issues) {
        boolean hasLinkedRequirement = testCase.linkedRequirementReferences() != null
                && testCase.linkedRequirementReferences().stream().anyMatch(reference -> !isBlank(reference));
        boolean hasSourceEvidence = !isBlank(testCase.bddScenario());

        if (!hasLinkedRequirement && !hasSourceEvidence) {
            issues.add(AiValidationIssue.warning(
                    "TEST_CASE_TRACEABILITY_MISSING",
                    "Test case has no linked requirement or source evidence.",
                    path + ".linkedRequirementReferences"
            ));
        }
    }

    private void validateDuplicateTestCase(
            GeneratedTestCaseDto testCase,
            Set<String> normalizedTitlesAndObjectives,
            String path,
            List<AiValidationIssue> issues
    ) {
        if (isBlank(testCase.title()) || isBlank(testCase.description())) {
            return;
        }

        String duplicateKey = normalize(testCase.title()) + "|" + normalize(testCase.description());
        if (!normalizedTitlesAndObjectives.add(duplicateKey)) {
            issues.add(AiValidationIssue.error(
                    "DUPLICATE_TEST_CASE",
                    "Duplicate test case found by normalized title and objective.",
                    path
            ));
        }
    }

    private void validateQaScores(QaValidationResult qaValidation, String path, List<AiValidationIssue> issues) {
        if (qaValidation == null) {
            return;
        }

        validateScore(qaValidation.requirementQualityScore(), path + ".requirementQualityScore", issues);
        validateScore(qaValidation.testabilityScore(), path + ".testabilityScore", issues);
    }

    private void validateScore(double score, String path, List<AiValidationIssue> issues) {
        if (Double.isNaN(score) || score < 0.0 || score > 100.0) {
            issues.add(AiValidationIssue.error(
                    "SCORE_OUT_OF_RANGE",
                    "AI quality score must be between 0 and 100.",
                    path
            ));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
