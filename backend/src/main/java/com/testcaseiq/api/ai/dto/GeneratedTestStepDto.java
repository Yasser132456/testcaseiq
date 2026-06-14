package com.testcaseiq.api.ai.dto;

import java.util.UUID;

public record GeneratedTestStepDto(
        UUID id,
        int order,
        String action,
        String expectedResult
) {
    public GeneratedTestStepDto(int order, String action, String expectedResult) {
        this(null, order, action, expectedResult);
    }
}
