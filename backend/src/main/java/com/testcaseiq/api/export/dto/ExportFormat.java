package com.testcaseiq.api.export.dto;

public enum ExportFormat {
    MARKDOWN("markdown", "md", "text/markdown"),
    CSV("csv", "csv", "text/csv"),
    JSON("json", "json", "application/json"),
    PLAYWRIGHT("playwright", "spec.ts", "text/plain"),
    POSTMAN("postman", "postman_collection.json", "application/json");

    private final String pathSegment;
    private final String extension;
    private final String contentType;

    ExportFormat(String pathSegment, String extension, String contentType) {
        this.pathSegment = pathSegment;
        this.extension = extension;
        this.contentType = contentType;
    }

    public String pathSegment() {
        return pathSegment;
    }

    public String extension() {
        return extension;
    }

    public String contentType() {
        return contentType;
    }
}
