package com.testcaseiq.api.story.dto;

import java.util.List;
import java.util.UUID;

public record CoverageReportResponse(
        UUID storyId,
        List<RequirementCoverage> requirements,
        List<CoverageGap> gaps,
        int coveredCount,
        int totalRequirements
) {
}
