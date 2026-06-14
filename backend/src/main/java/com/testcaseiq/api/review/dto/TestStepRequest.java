package com.testcaseiq.api.review.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record TestStepRequest(
        @Min(value = 1, message = "Step order must be greater than zero")
        int order,

        @NotBlank(message = "Step action is required")
        String action,

        String expectedResult
) {
}
