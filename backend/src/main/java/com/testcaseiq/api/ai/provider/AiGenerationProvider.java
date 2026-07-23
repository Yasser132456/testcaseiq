package com.testcaseiq.api.ai.provider;

import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.GeneratedTestCaseDto;
import com.testcaseiq.api.ai.dto.RegenerateContext;
import com.testcaseiq.api.ai.dto.StoryAnalysisRequest;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.dto.TestGenerationRequest;

public interface AiGenerationProvider {

    StoryAnalysisResult analyzeStory(StoryAnalysisRequest request);

    GeneratedTestSuiteResult generateTestCases(TestGenerationRequest request);

    default GeneratedTestCaseDto regenerateTestCase(RegenerateContext context) {
        throw new UnsupportedOperationException("Test case regeneration is not supported by this AI provider");
    }

    default String providerName() {
        return getClass().getSimpleName();
    }

    default String modelName() {
        return null;
    }
}
