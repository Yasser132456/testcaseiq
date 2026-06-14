package com.testcaseiq.api.review.dto;

import jakarta.validation.constraints.NotNull;

public record TestCaseAutomationCandidateUpdateRequest(
        @NotNull(message = "Automation candidate flag is required")
        Boolean automationCandidate,

        String comment
) {
}
