package com.testcaseiq.api.project;

import jakarta.validation.constraints.Size;

public record ProjectUpdateRequest(
        @Size(max = 160)
        String name,

        @Size(max = 64)
        String key,

        String description
) {
}
