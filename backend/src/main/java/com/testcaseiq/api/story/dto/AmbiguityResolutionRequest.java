package com.testcaseiq.api.story.dto;

import com.testcaseiq.api.domain.enums.AmbiguityResolutionStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AmbiguityResolutionRequest(
        @Size(max = 4000) String resolutionNotes,
        @NotNull AmbiguityResolutionStatus status
) {
}
