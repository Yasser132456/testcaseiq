package com.testcaseiq.api.ai.provider;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.ResolvedClarification;
import com.testcaseiq.api.ai.dto.StoryAnalysisRequest;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.dto.TestGenerationRequest;
import com.testcaseiq.api.domain.enums.FocusArea;
import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.enums.TestCaseType;

class MockAiGenerationProviderTests {

    private final MockAiGenerationProvider provider = new MockAiGenerationProvider();

    @Test
    void analyzeStoryReturnsMockRequirementsAmbiguitiesAndCoverage() {
        UUID storyId = UUID.randomUUID();
        StoryAnalysisResult result = provider.analyzeStory(new StoryAnalysisRequest(
                storyId,
                "Create project",
                "As a QA lead, I want to create a project so that my team can organize test cases.",
                StoryType.USER_STORY,
                List.of()
        ));

        assertThat(result.storyId()).isEqualTo(storyId);
        assertThat(result.actor()).isEqualTo("QA lead");
        assertThat(result.goal()).contains("create a project");
        assertThat(result.requirements().requirements()).hasSizeGreaterThanOrEqualTo(2);
        assertThat(result.ambiguities().ambiguities()).isNotEmpty();
        assertThat(result.coveragePlan().coverageItems()).hasSize(3);
        assertThat(result.qaValidation().testabilityScore()).isGreaterThan(0.0);
    }

    @Test
    void analyzeStoryReferencesTitleAndAcceptanceCriteriaDeterministically() {
        UUID storyId = UUID.fromString("8c43c44f-503d-4b67-b511-d5a435edc503");
        StoryAnalysisRequest request = new StoryAnalysisRequest(
                storyId,
                "Clinician reviews lab results",
                """
                As a clinician, I want to review new lab results so I can decide whether to message the patient.
                AC: unread abnormal results are highlighted.
                AC: reviewed results move out of the urgent queue.
                """,
                StoryType.USER_STORY,
                List.of()
        );

        StoryAnalysisResult first = provider.analyzeStory(request);
        StoryAnalysisResult second = provider.analyzeStory(request);

        assertThat(first).usingRecursiveComparison().isEqualTo(second);
        assertThat(first.requirements().requirements())
                .anySatisfy(requirement -> assertThat(requirement.description())
                        .contains("Clinician reviews lab results", "unread abnormal results are highlighted"));
        assertThat(first.coveragePlan().coverageItems())
                .anySatisfy(item -> assertThat(item.description()).contains("reviewed results move out of the urgent queue"));
    }

    @Test
    void generateTestCasesReturnsFunctionalNegativeAndBoundaryTests() {
        UUID storyId = UUID.randomUUID();
        StoryAnalysisResult analysis = provider.analyzeStory(new StoryAnalysisRequest(
                storyId,
                "Create story",
                "As a tester, I want to create stories so that requirements are traceable.",
                StoryType.USER_STORY,
                List.of()
        ));

        GeneratedTestSuiteResult result = provider.generateTestCases(new TestGenerationRequest(
                storyId,
                "Create story",
                "As a tester, I want to create stories so that requirements are traceable.",
                analysis.requirements().requirements(),
                List.of(),
                null,
                List.of()
        ));

        assertThat(result.storyId()).isEqualTo(storyId);
        assertThat(result.testCases()).hasSize(3);
        assertThat(result.testCases()).extracting("type")
                .contains(TestCaseType.FUNCTIONAL, TestCaseType.NEGATIVE, TestCaseType.BOUNDARY);
        assertThat(result.testCases().get(0).steps()).isNotEmpty();
        assertThat(result.testCases().get(0).linkedRequirementReferences()).contains("REQ-1");
    }

    @Test
    void generateTestCasesUsesStoryTitleAndAcceptanceCriteriaDeterministically() {
        UUID storyId = UUID.fromString("3316ebd1-9d3b-4b06-98ef-2163e152e0ad");
        String title = "Dispatcher reassigns a delayed stop";
        String rawText = """
                As a route coordinator, I want to reassign a delayed stop so that the dock team can keep the trailer plan current.
                AC: only unsealed routes can be reassigned.
                AC: reassignment records the coordinator and reason.
                AC: the old driver receives a removal notification.
                """;

        StoryAnalysisResult analysis = provider.analyzeStory(new StoryAnalysisRequest(
                storyId,
                title,
                rawText,
                StoryType.USER_STORY,
                List.of()
        ));
        TestGenerationRequest request = new TestGenerationRequest(
                storyId,
                title,
                rawText,
                analysis.requirements().requirements(),
                List.of(),
                null,
                List.of()
        );

        GeneratedTestSuiteResult first = provider.generateTestCases(request);
        GeneratedTestSuiteResult second = provider.generateTestCases(request);

        assertThat(first).usingRecursiveComparison().isEqualTo(second);
        assertThat(first.suiteName()).isEqualTo("Mock AI Regression Suite");
        assertThat(first.testCases()).extracting("title")
                .containsExactly("Complete primary workflow successfully", "Reject incomplete required input", "Handle boundary-length input");
        assertThat(first.testCases()).extracting("description")
                .allSatisfy(value -> assertThat((String) value).contains("Dispatcher reassigns a delayed stop"));
        assertThat(first.testCases().get(0).bddScenario())
                .contains("Given", "When", "Then", "unsealed routes can be reassigned");
        assertThat(first.testCases())
                .anySatisfy(testCase -> assertThat(testCase.steps())
                        .anySatisfy(step -> assertThat(step.action()).contains("coordinator", "reason")));
    }

    @Test
    void generateTestCasesAddsOneDeterministicCasePerFocusAreaAndGuidanceToDescription() {
        UUID storyId = UUID.fromString("3316ebd1-9d3b-4b06-98ef-2163e152e0ad");
        TestGenerationRequest request = new TestGenerationRequest(
                storyId,
                "Mobile checkout",
                "As a buyer, I want to check out so that I can complete an order.",
                List.of(),
                List.of(new ResolvedClarification("Which wallet?", "Apple Pay is in scope.")),
                "Keep scenarios short enough for smoke runs.",
                List.of(FocusArea.MOBILE, FocusArea.ACCESSIBILITY)
        );

        GeneratedTestSuiteResult first = provider.generateTestCases(request);
        GeneratedTestSuiteResult second = provider.generateTestCases(request);

        assertThat(first).usingRecursiveComparison().isEqualTo(second);
        assertThat(first.description()).contains("Keep scenarios short enough for smoke runs.");
        assertThat(first.testCases()).hasSize(5);
        assertThat(first.testCases()).extracting("title")
                .endsWith("[MOBILE] Mobile checkout", "[ACCESSIBILITY] Mobile checkout");
        assertThat(first.testCases().subList(3, 5)).extracting("type")
                .containsExactly(TestCaseType.FUNCTIONAL, TestCaseType.ACCESSIBILITY);
    }
}
