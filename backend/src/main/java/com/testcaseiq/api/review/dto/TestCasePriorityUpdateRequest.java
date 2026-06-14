package com.testcaseiq.api.review.dto;

import com.testcaseiq.api.domain.enums.Priority;

import jakarta.validation.constraints.NotNull;

public record TestCasePriorityUpdateRequest(
        @NotNull(message = "Priority is required")
        Priority priority,

        String comment
) {
}
