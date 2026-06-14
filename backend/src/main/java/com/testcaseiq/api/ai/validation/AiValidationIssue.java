package com.testcaseiq.api.ai.validation;

public record AiValidationIssue(
        String code,
        String message,
        String path,
        AiValidationSeverity severity
) {
    public static AiValidationIssue error(String code, String message, String path) {
        return new AiValidationIssue(code, message, path, AiValidationSeverity.ERROR);
    }

    public static AiValidationIssue warning(String code, String message, String path) {
        return new AiValidationIssue(code, message, path, AiValidationSeverity.WARNING);
    }
}
