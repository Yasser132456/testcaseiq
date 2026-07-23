package com.testcaseiq.api.story;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.model.CoverageItem;
import com.testcaseiq.api.domain.model.Requirement;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.story.dto.CaseRef;
import com.testcaseiq.api.story.dto.CoverageGap;
import com.testcaseiq.api.story.dto.CoverageReportResponse;
import com.testcaseiq.api.story.dto.RequirementCoverage;

@Service
public class CoverageReportService {

    private final StoryRepository storyRepository;

    public CoverageReportService(StoryRepository storyRepository) {
        this.storyRepository = storyRepository;
    }

    @Transactional(readOnly = true)
    public CoverageReportResponse getReport(UUID storyId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story not found: " + storyId));

        List<RequirementCoverage> requirements = story.getRequirements().stream()
                .map(requirement -> toRequirementCoverage(story, requirement))
                .sorted(requirementComparator())
                .toList();

        List<CoverageGap> requirementGaps = requirements.stream()
                .filter(requirement -> !requirement.covered())
                .map(requirement -> new CoverageGap(
                        requirement.reference(),
                        requirement.title(),
                        requirement.riskLevel(),
                        "REQUIREMENT"
                ))
                .toList();

        List<CoverageGap> categoryGaps = story.getCoverageItems().stream()
                .filter(coverageItem -> linkedCases(story, coverageItem.getRequirement()).isEmpty())
                .map(this::toCategoryGap)
                .toList();

        List<CoverageGap> gaps = Stream.concat(requirementGaps.stream(), categoryGaps.stream())
                .sorted(gapComparator())
                .toList();

        int coveredCount = (int) requirements.stream().filter(RequirementCoverage::covered).count();
        return new CoverageReportResponse(story.getId(), requirements, gaps, coveredCount, requirements.size());
    }

    private RequirementCoverage toRequirementCoverage(Story story, Requirement requirement) {
        List<CaseRef> linkedCases = linkedCases(story, requirement).stream()
                .map(testCase -> new CaseRef(testCase.getId(), testCase.getTitle(), testCase.getReviewStatus()))
                .sorted(Comparator
                        .comparing(CaseRef::title, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(caseRef -> caseRef.id() == null ? "" : caseRef.id().toString()))
                .toList();
        return new RequirementCoverage(
                requirement.getSourceReference(),
                requirement.getTitle(),
                requirement.getRiskLevel(),
                linkedCases,
                !linkedCases.isEmpty()
        );
    }

    private List<TestCase> linkedCases(Story story, Requirement requirement) {
        if (requirement == null) {
            return List.of();
        }
        return story.getTestSuites().stream()
                .flatMap(testSuite -> testSuite.getTestCases().stream())
                .filter(testCase -> testCase.getRequirements().contains(requirement))
                .toList();
    }

    private CoverageGap toCategoryGap(CoverageItem coverageItem) {
        return new CoverageGap(
                coverageItem.getCategory().name(),
                coverageItem.getDescription(),
                coverageItem.getRiskLevel(),
                "CATEGORY"
        );
    }

    private Comparator<RequirementCoverage> requirementComparator() {
        return Comparator
                .comparing(RequirementCoverage::riskLevel, this::compareRiskDescending)
                .thenComparing(RequirementCoverage::reference, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                .thenComparing(RequirementCoverage::title, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
    }

    private Comparator<CoverageGap> gapComparator() {
        return Comparator
                .comparing(CoverageGap::riskLevel, this::compareRiskDescending)
                .thenComparingInt(gap -> "REQUIREMENT".equals(gap.kind()) ? 0 : 1)
                .thenComparing(CoverageGap::key, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                .thenComparing(CoverageGap::description, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
    }

    private int compareRiskDescending(RiskLevel left, RiskLevel right) {
        return Integer.compare(riskRank(right), riskRank(left));
    }

    private int riskRank(RiskLevel riskLevel) {
        if (riskLevel == null) return 0;
        return switch (riskLevel) {
            case CRITICAL -> 4;
            case HIGH -> 3;
            case MEDIUM -> 2;
            case LOW -> 1;
        };
    }
}
