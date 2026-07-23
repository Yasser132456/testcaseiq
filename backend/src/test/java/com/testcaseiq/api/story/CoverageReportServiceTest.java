package com.testcaseiq.api.story;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.testcaseiq.api.domain.enums.CoverageCategory;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.model.CoverageItem;
import com.testcaseiq.api.domain.model.Requirement;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.story.dto.CoverageReportResponse;

@ExtendWith(MockitoExtension.class)
class CoverageReportServiceTest {

    @Mock
    private StoryRepository storyRepository;

    @Test
    void reportsRequirementGapWhenRequirementHasNoLinkedCases() {
        Story story = story();
        Requirement requirement = requirement("REQ-1", "Payment succeeds", RiskLevel.HIGH);
        story.addRequirement(requirement);
        given(storyRepository.findById(story.getId())).willReturn(Optional.of(story));

        CoverageReportResponse report = new CoverageReportService(storyRepository).getReport(story.getId());

        assertThat(report.totalRequirements()).isEqualTo(1);
        assertThat(report.coveredCount()).isZero();
        assertThat(report.requirements()).singleElement().satisfies(row -> {
            assertThat(row.reference()).isEqualTo("REQ-1");
            assertThat(row.covered()).isFalse();
            assertThat(row.linkedCases()).isEmpty();
        });
        assertThat(report.gaps()).singleElement().satisfies(gap -> {
            assertThat(gap.key()).isEqualTo("REQ-1");
            assertThat(gap.kind()).isEqualTo("REQUIREMENT");
            assertThat(gap.riskLevel()).isEqualTo(RiskLevel.HIGH);
        });
    }

    @Test
    void marksRequirementCoveredWhenAnyCaseLinksIt() {
        Story story = story();
        Requirement requirement = requirement("REQ-2", "Declined cards are rejected", RiskLevel.MEDIUM);
        story.addRequirement(requirement);
        TestCase testCase = testCase("Card declined test");
        testCase.linkRequirement(requirement);
        TestSuite suite = new TestSuite("Checkout suite");
        suite.addTestCase(testCase);
        story.addTestSuite(suite);
        given(storyRepository.findById(story.getId())).willReturn(Optional.of(story));

        CoverageReportResponse report = new CoverageReportService(storyRepository).getReport(story.getId());

        assertThat(report.coveredCount()).isEqualTo(1);
        assertThat(report.totalRequirements()).isEqualTo(1);
        assertThat(report.requirements()).singleElement().satisfies(row -> {
            assertThat(row.covered()).isTrue();
            assertThat(row.linkedCases()).singleElement().satisfies(caseRef -> {
                assertThat(caseRef.title()).isEqualTo("Card declined test");
                assertThat(caseRef.status()).isEqualTo(ReviewStatus.NEEDS_REVIEW);
            });
        });
        assertThat(report.gaps()).isEmpty();
    }

    @Test
    void reportsCategoryGapWhenCoverageItemRequirementHasNoLinkedCase() {
        Story story = story();
        Requirement coveredRequirement = requirement("REQ-3", "Approved card is accepted", RiskLevel.LOW);
        Requirement uncoveredRequirement = requirement("REQ-4", "Expired card is rejected", RiskLevel.CRITICAL);
        story.addRequirement(coveredRequirement);
        story.addRequirement(uncoveredRequirement);
        CoverageItem coverageItem = new CoverageItem(CoverageCategory.NEGATIVE_PATH, "Expired card decline path");
        coverageItem.setRequirement(uncoveredRequirement);
        coverageItem.setRiskLevel(RiskLevel.CRITICAL);
        story.addCoverageItem(coverageItem);
        TestCase testCase = testCase("Approved card test");
        testCase.linkRequirement(coveredRequirement);
        TestSuite suite = new TestSuite("Checkout suite");
        suite.addTestCase(testCase);
        story.addTestSuite(suite);
        given(storyRepository.findById(story.getId())).willReturn(Optional.of(story));

        CoverageReportResponse report = new CoverageReportService(storyRepository).getReport(story.getId());

        assertThat(report.coveredCount()).isEqualTo(1);
        assertThat(report.totalRequirements()).isEqualTo(2);
        assertThat(report.gaps()).extracting("kind").containsExactly("REQUIREMENT", "CATEGORY");
        assertThat(report.gaps()).last().satisfies(gap -> {
            assertThat(gap.key()).isEqualTo("NEGATIVE_PATH");
            assertThat(gap.description()).isEqualTo("Expired card decline path");
            assertThat(gap.riskLevel()).isEqualTo(RiskLevel.CRITICAL);
        });
    }

    private Story story() {
        Story story = new Story("Checkout", StoryType.USER_STORY);
        ReflectionTestUtils.setField(story, "id", UUID.randomUUID());
        return story;
    }

    private Requirement requirement(String reference, String title, RiskLevel riskLevel) {
        Requirement requirement = new Requirement(title, RequirementType.FUNCTIONAL);
        requirement.setSourceReference(reference);
        requirement.setDescription(title + " description");
        requirement.setRiskLevel(riskLevel);
        return requirement;
    }

    private TestCase testCase(String title) {
        TestCase testCase = new TestCase(title, TestCaseType.FUNCTIONAL);
        ReflectionTestUtils.setField(testCase, "id", UUID.randomUUID());
        testCase.setReviewStatus(ReviewStatus.NEEDS_REVIEW);
        return testCase;
    }
}
