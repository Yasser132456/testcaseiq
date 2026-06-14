package com.testcaseiq.api.ai.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.StoryAnalysisRequest;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.dto.TestGenerationRequest;
import com.testcaseiq.api.ai.prompt.AiPromptTemplates;
import com.testcaseiq.api.domain.enums.StoryType;

class OpenAiGenerationProviderTests {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final AiPromptTemplates promptTemplates = new AiPromptTemplates("analysis prompt", "generation prompt");

    @Test
    void parsesAndNormalizesValidStoryAnalysisJson() {
        UUID storyId = UUID.randomUUID();
        OpenAiGenerationProvider provider = providerReturning("""
                {
                  "storyId": "%s",
                  "actor": "QA lead",
                  "goal": "create a project",
                  "requirements": {
                    "requirements": [
                      {
                        "reference": "REQ-1",
                        "title": "Create project",
                        "description": "QA lead can create a project.",
                        "type": "FUNCTIONAL",
                        "priority": "HIGH",
                        "riskLevel": "MEDIUM"
                      }
                    ],
                    "acceptanceCriteria": ["Given valid project details"]
                  },
                  "ambiguities": {
                    "ambiguities": [
                      {
                        "question": "Which fields are mandatory?",
                        "context": "The story omits field validation.",
                        "severity": "MEDIUM"
                      }
                    ]
                  },
                  "coveragePlan": {
                    "coverageItems": [
                      {
                        "requirementReference": "REQ-1",
                        "category": "HAPPY_PATH",
                        "description": "Verify successful project creation.",
                        "riskLevel": "MEDIUM"
                      }
                    ]
                  },
                  "qaValidation": {
                    "requirementQualityScore": 0.86,
                    "testabilityScore": 0.82,
                    "warnings": []
                  }
                }
                """.formatted(storyId));

        StoryAnalysisResult result = provider.analyzeStory(new StoryAnalysisRequest(
                storyId,
                "Create project",
                "As a QA lead, I want to create a project.",
                StoryType.USER_STORY,
                List.of()
        ));

        assertThat(result.provider()).isEqualTo("openai");
        assertThat(result.generatedAt()).isNotNull();
        assertThat(result.requirements().requirements()).hasSize(1);
        assertThat(result.ambiguities().ambiguities()).hasSize(1);
        assertThat(result.coveragePlan().coverageItems()).hasSize(1);
    }

    @Test
    void parsesJsonInsideMarkdownFence() {
        UUID storyId = UUID.randomUUID();
        OpenAiGenerationProvider provider = providerReturning("""
                ```json
                {
                  "storyId": "%s",
                  "suiteName": "Manual regression suite",
                  "testCases": [
                    {
                      "title": "Create project successfully",
                      "description": "Manual happy path.",
                      "type": "FUNCTIONAL",
                      "testLayer": "UI",
                      "priority": "HIGH",
                      "riskLevel": "MEDIUM",
                      "automationCandidate": false,
                      "confidenceScore": 0.88,
                      "bddScenario": "Given valid details\\nWhen the project is created\\nThen it is available",
                      "linkedRequirementReferences": ["REQ-1"],
                      "steps": [
                        {
                          "order": 1,
                          "action": "Submit valid project details.",
                          "expectedResult": "The project is created."
                        }
                      ],
                      "testData": [
                        {
                          "name": "validProject",
                          "valueJson": "{\\"name\\":\\"Portal\\"}"
                        }
                      ]
                    }
                  ],
                  "qaValidation": {
                    "requirementQualityScore": 0.86,
                    "testabilityScore": 0.82,
                    "warnings": []
                  }
                }
                ```
                """.formatted(storyId));

        GeneratedTestSuiteResult result = provider.generateTestCases(new TestGenerationRequest(
                storyId,
                "Create project",
                "As a QA lead, I want to create a project.",
                List.of()
        ));

        assertThat(result.provider()).isEqualTo("openai");
        assertThat(result.generatedAt()).isNotNull();
        assertThat(result.testCases()).hasSize(1);
        assertThat(result.testCases().get(0).steps()).hasSize(1);
    }

    @Test
    void rejectsInvalidAnalysisOutput() {
        UUID storyId = UUID.randomUUID();
        OpenAiGenerationProvider provider = providerReturning("""
                {
                  "storyId": "%s",
                  "actor": "QA lead",
                  "goal": "create a project"
                }
                """.formatted(storyId));

        assertThatThrownBy(() -> provider.analyzeStory(new StoryAnalysisRequest(
                storyId,
                "Create project",
                "As a QA lead, I want to create a project.",
                StoryType.USER_STORY,
                List.of()
        )))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("requirements");
    }

    @Test
    void rejectsGeneratedTestsWithoutReviewableManualSteps() {
        UUID storyId = UUID.randomUUID();
        OpenAiGenerationProvider provider = providerReturning("""
                {
                  "storyId": "%s",
                  "suiteName": "Manual regression suite",
                  "testCases": [],
                  "qaValidation": {
                    "requirementQualityScore": 0.8,
                    "testabilityScore": 0.8,
                    "warnings": []
                  }
                }
                """.formatted(storyId));

        assertThatThrownBy(() -> provider.generateTestCases(new TestGenerationRequest(
                storyId,
                "Create project",
                "As a QA lead, I want to create a project.",
                List.of()
        )))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("testCases");
    }

    @Test
    void wrapsChatClientFailuresAsProviderExceptions() {
        OpenAiGenerationProvider provider = new OpenAiGenerationProvider(
                prompt -> {
                    throw new IllegalStateException("transport unavailable");
                },
                objectMapper,
                promptTemplates,
                "gpt-test"
        );

        assertThatThrownBy(() -> provider.generateTestCases(new TestGenerationRequest(
                UUID.randomUUID(),
                "Create project",
                "As a QA lead, I want to create a project.",
                List.of()
        )))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("AI provider request failed")
                .hasCauseInstanceOf(IllegalStateException.class);
    }

    private OpenAiGenerationProvider providerReturning(String content) {
        return new OpenAiGenerationProvider(prompt -> content, objectMapper, promptTemplates, "gpt-test");
    }
}
