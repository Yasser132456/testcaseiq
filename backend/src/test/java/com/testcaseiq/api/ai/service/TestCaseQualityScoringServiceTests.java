package com.testcaseiq.api.ai.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.testcaseiq.api.ai.dto.GeneratedTestCaseDto;
import com.testcaseiq.api.ai.dto.GeneratedTestDataDto;
import com.testcaseiq.api.ai.dto.GeneratedTestStepDto;
import com.testcaseiq.api.domain.enums.ConfidenceLevel;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;

class TestCaseQualityScoringServiceTests {

    private final TestCaseQualityScoringService service = new TestCaseQualityScoringService();

    private static final List<GeneratedTestStepDto> STEPS = List.of(
            new GeneratedTestStepDto(1, "Open workspace.", "Workspace loads."),
            new GeneratedTestStepDto(2, "Enter valid input.", "Input accepted.")
    );

    @Test
    void completeTestCaseScoresHundred() {
        GeneratedTestCaseDto dto = complete();
        int score = service.score(dto);
        assertThat(score).isEqualTo(100);
    }

    @Test
    void completeTestCaseHasHighConfidence() {
        assertThat(service.confidenceLevel(100)).isEqualTo(ConfidenceLevel.HIGH);
        assertThat(service.confidenceLevel(80)).isEqualTo(ConfidenceLevel.HIGH);
    }

    @Test
    void missingTitleReducesScoreByTwenty() {
        GeneratedTestCaseDto dto = withTitle(null);
        assertThat(service.score(dto)).isEqualTo(80);
    }

    @Test
    void missingDescriptionReducesScoreByTen() {
        GeneratedTestCaseDto dto = withDescription(null);
        assertThat(service.score(dto)).isEqualTo(90);
    }

    @Test
    void emptyStepsReducesScoreByTwenty() {
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                "Title", "Objective", TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, RiskLevel.MEDIUM, true, 0.9,
                "Given something\nWhen done\nThen passes",
                List.of("REQ-1"), List.of(), List.of(),
                "Rationale", "AC text"
        );
        assertThat(service.score(dto)).isEqualTo(80);
    }

    @Test
    void stepsWithMissingExpectedResultDeductFiveEach() {
        List<GeneratedTestStepDto> stepsNoExpected = List.of(
                new GeneratedTestStepDto(1, "Step 1.", null),
                new GeneratedTestStepDto(2, "Step 2.", null)
        );
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                "Title", "Objective", TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, RiskLevel.MEDIUM, true, 0.9,
                "Given something\nWhen done\nThen passes",
                List.of("REQ-1"), stepsNoExpected, List.of(),
                "Rationale", "AC text"
        );
        assertThat(service.score(dto)).isEqualTo(90);
    }

    @Test
    void stepMissingExpectedResultDeductionCapsAtFifteen() {
        List<GeneratedTestStepDto> fourStepsNoExpected = List.of(
                new GeneratedTestStepDto(1, "A.", null),
                new GeneratedTestStepDto(2, "B.", null),
                new GeneratedTestStepDto(3, "C.", null),
                new GeneratedTestStepDto(4, "D.", null)
        );
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                "Title", "Objective", TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, RiskLevel.MEDIUM, true, 0.9,
                "Given something\nWhen done\nThen passes",
                List.of("REQ-1"), fourStepsNoExpected, List.of(),
                "Rationale", "AC text"
        );
        int score = service.score(dto);
        assertThat(score).isEqualTo(85);
    }

    @Test
    void missingTraceabilityReducesScoreByTen() {
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                "Title", "Objective", TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, RiskLevel.MEDIUM, true, 0.9,
                null, List.of(), STEPS, List.of(),
                "Rationale", "AC text"
        );
        assertThat(service.score(dto)).isEqualTo(90);
    }

    @Test
    void missingPriorityReducesScoreByFive() {
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                "Title", "Objective", TestCaseType.FUNCTIONAL, TestLayer.UI,
                null, RiskLevel.MEDIUM, true, 0.9,
                "Given\nWhen\nThen",
                List.of("REQ-1"), STEPS, List.of(),
                "Rationale", "AC text"
        );
        assertThat(service.score(dto)).isEqualTo(95);
    }

    @Test
    void missingRiskLevelReducesScoreByFive() {
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                "Title", "Objective", TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, null, true, 0.9,
                "Given\nWhen\nThen",
                List.of("REQ-1"), STEPS, List.of(),
                "Rationale", "AC text"
        );
        assertThat(service.score(dto)).isEqualTo(95);
    }

    @Test
    void multipleDefectsProduceLowConfidence() {
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                null, null, TestCaseType.FUNCTIONAL, TestLayer.UI,
                null, null, true, 0.0,
                null, List.of(), List.of(), List.of(),
                null, null
        );
        int score = service.score(dto);
        assertThat(score).isLessThan(50);
        assertThat(service.confidenceLevel(score)).isEqualTo(ConfidenceLevel.LOW);
    }

    @Test
    void scoreClampedToZero() {
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                null, null, null, null,
                null, null, false, 0.0,
                null, null, null, null,
                null, null
        );
        assertThat(service.score(dto)).isGreaterThanOrEqualTo(0);
    }

    @Test
    void confidenceLevelMediumForScoreFiftyToSeventynine() {
        assertThat(service.confidenceLevel(79)).isEqualTo(ConfidenceLevel.MEDIUM);
        assertThat(service.confidenceLevel(50)).isEqualTo(ConfidenceLevel.MEDIUM);
    }

    @Test
    void confidenceLevelLowForScoreBelowFifty() {
        assertThat(service.confidenceLevel(49)).isEqualTo(ConfidenceLevel.LOW);
        assertThat(service.confidenceLevel(0)).isEqualTo(ConfidenceLevel.LOW);
    }

    @Test
    void linkedRequirementCountsAsTraceability() {
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                "Title", "Objective", TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, RiskLevel.MEDIUM, true, 0.9,
                null, List.of("REQ-1"), STEPS, List.of(),
                "Rationale", "AC text"
        );
        assertThat(service.score(dto)).isEqualTo(100);
    }

    @Test
    void bddScenarioAloneCountsAsTraceability() {
        GeneratedTestCaseDto dto = new GeneratedTestCaseDto(
                "Title", "Objective", TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, RiskLevel.MEDIUM, true, 0.9,
                "Given\nWhen\nThen",
                List.of(), STEPS, List.of(),
                "Rationale", "AC text"
        );
        assertThat(service.score(dto)).isEqualTo(100);
    }

    private GeneratedTestCaseDto complete() {
        return new GeneratedTestCaseDto(
                "Verify primary workflow", "Covers the happy path.",
                TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, RiskLevel.MEDIUM, true, 0.9,
                "Given a valid user\nWhen workflow completed\nThen outcome shown",
                List.of("REQ-1"), STEPS, List.of(),
                "Covers core acceptance criterion.", "AC: Given valid user."
        );
    }

    private GeneratedTestCaseDto withTitle(String title) {
        return new GeneratedTestCaseDto(
                title, "Covers the happy path.",
                TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, RiskLevel.MEDIUM, true, 0.9,
                "Given a valid user\nWhen workflow completed\nThen outcome shown",
                List.of("REQ-1"), STEPS, List.of(),
                "Rationale.", "AC text."
        );
    }

    private GeneratedTestCaseDto withDescription(String description) {
        return new GeneratedTestCaseDto(
                "Verify primary workflow", description,
                TestCaseType.FUNCTIONAL, TestLayer.UI,
                Priority.HIGH, RiskLevel.MEDIUM, true, 0.9,
                "Given a valid user\nWhen workflow completed\nThen outcome shown",
                List.of("REQ-1"), STEPS, List.of(),
                "Rationale.", "AC text."
        );
    }
}
