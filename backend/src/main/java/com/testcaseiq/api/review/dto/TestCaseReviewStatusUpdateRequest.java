package com.testcaseiq.api.review.dto;

import com.testcaseiq.api.domain.enums.ReviewStatus;

import jakarta.validation.constraints.NotNull;

public record TestCaseReviewStatusUpdateRequest(
        @NotNull(message = "Review status is required")
        ReviewStatus status,

        String comment
) {
}
