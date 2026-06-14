package com.testcaseiq.api.export.dto;

import java.util.List;
import java.util.UUID;

public record TestCaseExportDocument(
        UUID storyId,
        String storyTitle,
        String storyReference,
        UUID testSuiteId,
        String testSuiteName,
        List<ApprovedTestCaseExport> testCases
) {
}
