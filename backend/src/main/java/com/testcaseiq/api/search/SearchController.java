package com.testcaseiq.api.search;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.common.error.BadRequestException;

@RestController
public class SearchController {

    private static final int MAX_QUERY_LENGTH = 100;

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/api/search")
    @PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public SearchResultsResponse search(@RequestParam String q) {
        String query = q == null ? "" : q.trim();
        if (query.length() > MAX_QUERY_LENGTH) {
            throw new BadRequestException("Search query must be 100 characters or fewer");
        }
        return searchService.search(query);
    }
}
