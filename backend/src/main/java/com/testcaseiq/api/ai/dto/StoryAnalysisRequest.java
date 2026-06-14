package com.testcaseiq.api.ai.dto;

import java.util.List;
import java.util.UUID;

import com.testcaseiq.api.domain.enums.StoryType;

public record StoryAnalysisRequest(
        UUID storyId,
        String title,
        String rawText,
        StoryType storyType,
        List<String> acceptanceCriteria
) {
}
