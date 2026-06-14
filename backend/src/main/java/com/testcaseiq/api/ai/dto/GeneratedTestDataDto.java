package com.testcaseiq.api.ai.dto;

import java.util.UUID;

public record GeneratedTestDataDto(
        UUID id,
        String name,
        String valueJson
) {
    public GeneratedTestDataDto(String name, String valueJson) {
        this(null, name, valueJson);
    }
}
