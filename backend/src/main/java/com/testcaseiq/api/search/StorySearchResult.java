package com.testcaseiq.api.search;

import java.util.UUID;

public record StorySearchResult(UUID id, String title, SearchResultType type) {
}
