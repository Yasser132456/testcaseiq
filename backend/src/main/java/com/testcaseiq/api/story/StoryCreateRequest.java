package com.testcaseiq.api.story;

import com.testcaseiq.api.domain.enums.StoryType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoryCreateRequest(
        @NotBlank(message = "Story title is required")
        @Size(max = 240)
        String title,

        @NotBlank(message = "Story raw text is required")
        String rawText,

        @NotNull(message = "Story type is required")
        StoryType type,

        @Size(max = 160)
        String externalReference,

        String metadataJson
) {
}
