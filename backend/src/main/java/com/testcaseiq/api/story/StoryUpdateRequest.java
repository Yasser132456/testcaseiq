package com.testcaseiq.api.story;

import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;

import jakarta.validation.constraints.Size;

public record StoryUpdateRequest(
        @Size(max = 240)
        String title,

        String rawText,

        StoryType type,

        StoryStatus status,

        @Size(max = 160)
        String externalReference,

        String metadataJson
) {
}
