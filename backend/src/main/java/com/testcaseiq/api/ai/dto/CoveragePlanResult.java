package com.testcaseiq.api.ai.dto;

import java.util.List;

public record CoveragePlanResult(
        List<CoverageItemDto> coverageItems
) {
}
