package com.testcaseiq.api.review.dto;

import java.util.UUID;

public record TestStepResponse(
        UUID id,
        int order,
        String action,
        String expectedResult
) {
}
