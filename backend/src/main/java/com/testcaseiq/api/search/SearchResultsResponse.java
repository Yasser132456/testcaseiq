package com.testcaseiq.api.search;

import java.util.List;

public record SearchResultsResponse(
        List<ProjectSearchResult> projects,
        List<StorySearchResult> stories,
        List<TestSuiteSearchResult> testSuites,
        List<TestCaseSearchResult> testCases
) {
    public static SearchResultsResponse empty() {
        return new SearchResultsResponse(List.of(), List.of(), List.of(), List.of());
    }
}
