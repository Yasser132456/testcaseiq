package com.testcaseiq.api.ai.dto;

import java.util.List;

import com.testcaseiq.api.domain.enums.FocusArea;

public record TestGenerationOptions(String guidance, List<FocusArea> focusAreas) {
    public TestGenerationOptions {
        focusAreas = focusAreas == null ? List.of() : List.copyOf(focusAreas);
    }
}
