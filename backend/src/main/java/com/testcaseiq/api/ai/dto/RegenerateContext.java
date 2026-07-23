package com.testcaseiq.api.ai.dto;

import java.util.List;
import java.util.UUID;

public record RegenerateContext(
        UUID testCaseId,
        String storyTitle,
        String storyText,
        String currentTitle,
        String reason,
        List<ResolvedClarification> clarifications
) {
}
