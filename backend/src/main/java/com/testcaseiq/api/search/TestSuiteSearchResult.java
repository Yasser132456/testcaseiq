package com.testcaseiq.api.search;

import java.util.UUID;

public record TestSuiteSearchResult(UUID id, String name, SearchResultType type) {
}
