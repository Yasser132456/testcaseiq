package com.testcaseiq.api.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProjectCreateRequest(
        @NotBlank(message = "Project name is required")
        @Size(max = 160)
        String name,

        @Size(max = 64)
        String key,

        String description
) {
}
