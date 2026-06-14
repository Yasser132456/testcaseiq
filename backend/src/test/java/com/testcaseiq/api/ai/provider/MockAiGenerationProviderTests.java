package com.testcaseiq.api.ai.provider;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.StoryAnalysisRequest;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.dto.TestGenerationRequest;
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
                analysis.requirements().requirements()
        ));

        assertThat(result.storyId()).isEqualTo(storyId);
        assertThat(result.testCases()).hasSize(3);
        assertThat(result.testCases()).extracting("type")
                .contains(TestCaseType.FUNCTIONAL, TestCaseType.NEGATIVE, TestCaseType.BOUNDARY);
        assertThat(result.testCases().get(0).steps()).isNotEmpty();
        assertThat(result.testCases().get(0).linkedRequirementReferences()).contains("REQ-1");
    }
}
