package com.testcaseiq.api.search;

import java.util.UUID;

public record TestCaseSearchResult(UUID id, UUID storyId, String title, SearchResultType type) {
}
