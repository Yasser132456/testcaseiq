package com.testcaseiq.api.ai.provider;

import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.StoryAnalysisRequest;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.dto.TestGenerationRequest;

public interface AiGenerationProvider {

    StoryAnalysisResult analyzeStory(StoryAnalysisRequest request);

    GeneratedTestSuiteResult generateTestCases(TestGenerationRequest request);
}
