package com.testcaseiq.api.ai.validation;

import java.util.List;

public record StoryAnalysisValidationResult(List<AiValidationIssue> issues) {
    public StoryAnalysisValidationResult {
        issues = List.copyOf(issues);
    }

    public boolean valid() {
        return errors().isEmpty();
    }

    public List<AiValidationIssue> errors() {
        return issues.stream()
                .filter(issue -> issue.severity() == AiValidationSeverity.ERROR)
                .toList();
    }

    public List<AiValidationIssue> warnings() {
        return issues.stream()
                .filter(issue -> issue.severity() == AiValidationSeverity.WARNING)
                .toList();
    }
}
