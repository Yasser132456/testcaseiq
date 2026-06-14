package com.testcaseiq.api.review.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

public record TestCaseUpdateRequest(
        @Size(max = 240, message = "Title must be 240 characters or fewer")
        String title,

        String objective,

        String preconditions,

        String bddScenario,

        @Valid
        List<TestStepRequest> steps,

        String comment
) {
}
