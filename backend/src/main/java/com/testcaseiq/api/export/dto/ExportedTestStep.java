package com.testcaseiq.api.export.dto;

public record ExportedTestStep(
        int order,
        String action,
        String expectedResult
) {
}
