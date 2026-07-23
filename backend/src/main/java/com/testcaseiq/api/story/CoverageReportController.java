package com.testcaseiq.api.story;

import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.story.dto.CoverageReportResponse;

@RestController
public class CoverageReportController {

    private final CoverageReportService coverageReportService;

    public CoverageReportController(CoverageReportService coverageReportService) {
        this.coverageReportService = coverageReportService;
    }

    @GetMapping("/api/stories/{storyId}/coverage")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public CoverageReportResponse getReport(@PathVariable UUID storyId) {
        return coverageReportService.getReport(storyId);
    }
}
