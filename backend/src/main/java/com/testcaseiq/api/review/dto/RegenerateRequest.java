package com.testcaseiq.api.review.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegenerateRequest(
        @NotBlank(message = "Regeneration reason is required")
        @Size(max = 2000, message = "Regeneration reason must be 2000 characters or fewer")
        String reason
) {
}
