package com.testcaseiq.api.search;

import java.util.UUID;

public record ProjectSearchResult(UUID id, String name, SearchResultType type) {
}
