package com.testcaseiq.api.export.dto;

public record ExportResult(
        String filename,
        String contentType,
        String content
) {
}
