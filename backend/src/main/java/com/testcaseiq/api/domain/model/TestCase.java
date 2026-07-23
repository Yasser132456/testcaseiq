package com.testcaseiq.api.domain.model;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.testcaseiq.api.domain.enums.ConfidenceLevel;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "test_cases")
public class TestCase extends AuditableEntity {

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "test_suite_id", nullable = false)
    private TestSuite testSuite;

    @NotBlank
    @Size(max = 240)
    @Column(nullable = false, length = 240)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private TestCaseType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_layer", length = 64)
    private TestLayer testLayer;

    @Enumerated(EnumType.STRING)
    @Column(length = 64)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", length = 64)
    private RiskLevel riskLevel;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 64)
    private ReviewStatus reviewStatus = ReviewStatus.DRAFT;

    @Column(columnDefinition = "text")
    private String preconditions;

    @Column(name = "expected_result", columnDefinition = "text")
    private String expectedResult;

    @Column(name = "automation_candidate", nullable = false)
    private boolean automationCandidate;

    @Column(name = "quality_score")
    private Integer qualityScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "confidence_level", length = 16)
    private ConfidenceLevel confidenceLevel;

    @Column(name = "generation_rationale", columnDefinition = "text")
    private String generationRationale;

    @Column(name = "linked_acceptance_criteria_text", columnDefinition = "text")
    private String linkedAcceptanceCriteriaText;

    @OneToMany(mappedBy = "testCase", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestStep> testSteps = new ArrayList<>();

    @OneToMany(mappedBy = "testCase", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestData> testDataEntries = new ArrayList<>();

    @OneToMany(mappedBy = "testCase", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReviewEvent> reviewEvents = new ArrayList<>();

    @ManyToMany
    @JoinTable(
            name = "test_case_requirements",
            joinColumns = @JoinColumn(name = "test_case_id"),
            inverseJoinColumns = @JoinColumn(name = "requirement_id")
    )
    private Set<Requirement> requirements = new HashSet<>();

    protected TestCase() {
    }

    public TestCase(String title, TestCaseType type) {
        this.title = title;
        this.type = type;
    }

    public void addStep(TestStep testStep) {
        testSteps.add(testStep);
        testStep.setTestCase(this);
    }

    public void addTestData(TestData testData) {
        testDataEntries.add(testData);
        testData.setTestCase(this);
    }

    public void addReviewEvent(ReviewEvent reviewEvent) {
        reviewEvents.add(reviewEvent);
        reviewEvent.setTestCase(this);
    }

    public void linkRequirement(Requirement requirement) {
        requirements.add(requirement);
        requirement.getTestCases().add(this);
    }

    public TestSuite getTestSuite() {
        return testSuite;
    }

    public void setTestSuite(TestSuite testSuite) {
        this.testSuite = testSuite;
    }

    public String getTitle() {
        return title;
    }

    public TestCaseType getType() {
        return type;
    }

    public String getDescription() {
        return description;
    }

    public TestLayer getTestLayer() {
        return testLayer;
    }

    public Priority getPriority() {
        return priority;
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public ReviewStatus getReviewStatus() {
        return reviewStatus;
    }

    public String getPreconditions() {
        return preconditions;
    }

    public String getExpectedResult() {
        return expectedResult;
    }

    public boolean isAutomationCandidate() {
        return automationCandidate;
    }

    public List<TestStep> getTestSteps() {
        return testSteps;
    }

    public List<TestData> getTestDataEntries() {
        return testDataEntries;
    }

    public List<ReviewEvent> getReviewEvents() {
        return reviewEvents;
    }

    public Set<Requirement> getRequirements() {
        return requirements;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setTestLayer(TestLayer testLayer) {
        this.testLayer = testLayer;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public void setRiskLevel(RiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public void setReviewStatus(ReviewStatus reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public void setPreconditions(String preconditions) {
        this.preconditions = preconditions;
    }

    public void setExpectedResult(String expectedResult) {
        this.expectedResult = expectedResult;
    }

    public void setAutomationCandidate(boolean automationCandidate) {
        this.automationCandidate = automationCandidate;
    }

    public Integer getQualityScore() {
        return qualityScore;
    }

    public void setQualityScore(Integer qualityScore) {
        this.qualityScore = qualityScore;
    }

    public ConfidenceLevel getConfidenceLevel() {
        return confidenceLevel;
    }

    public void setConfidenceLevel(ConfidenceLevel confidenceLevel) {
        this.confidenceLevel = confidenceLevel;
    }

    public String getGenerationRationale() {
        return generationRationale;
    }

    public void setGenerationRationale(String generationRationale) {
        this.generationRationale = generationRationale;
    }

    public String getLinkedAcceptanceCriteriaText() {
        return linkedAcceptanceCriteriaText;
    }

    public void setLinkedAcceptanceCriteriaText(String linkedAcceptanceCriteriaText) {
        this.linkedAcceptanceCriteriaText = linkedAcceptanceCriteriaText;
    }

    public void replaceSteps(List<TestStep> replacementSteps) {
        testSteps.clear();
        replacementSteps.forEach(this::addStep);
    }

    public void replaceTestData(List<TestData> replacementTestData) {
        testDataEntries.clear();
        replacementTestData.forEach(this::addTestData);
    }
}
