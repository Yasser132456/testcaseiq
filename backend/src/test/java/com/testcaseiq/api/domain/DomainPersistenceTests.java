package com.testcaseiq.api.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.testcaseiq.api.domain.enums.AiJobStatus;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;
import com.testcaseiq.api.domain.enums.CoverageCategory;
import com.testcaseiq.api.domain.enums.ExportStatus;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.RequirementType;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;
import com.testcaseiq.api.domain.model.AiJob;
import com.testcaseiq.api.domain.model.Ambiguity;
import com.testcaseiq.api.domain.model.CoverageItem;
import com.testcaseiq.api.domain.model.ExportJob;
import com.testcaseiq.api.domain.model.Project;
import com.testcaseiq.api.domain.model.Requirement;
import com.testcaseiq.api.domain.model.ReviewEvent;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestData;
import com.testcaseiq.api.domain.model.TestStep;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.ProjectRepository;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.domain.repository.TestCaseRepository;

@DataJpaTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.flyway.enabled=true"
})
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DomainPersistenceTests {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testcaseiq")
            .withUsername("testcaseiq")
            .withPassword("testcaseiq_dev_password");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private StoryRepository storyRepository;

    @Autowired
    private TestCaseRepository testCaseRepository;

    @Test
    void persistsProjectStoryAndGeneratedTestCaseGraph() {
        Project project = new Project("Checkout Platform", "CHECKOUT");
        Story story = new Story("Buyer can pay by card", StoryType.USER_STORY);
        story.setStoryText("As a buyer, I want to pay by card so I can complete my purchase.");
        story.setStatus(StoryStatus.ANALYZED);
        story.setMetadataJson("{\"source\":\"manual\"}");
        project.addStory(story);

        Requirement requirement = new Requirement("Payment authorization succeeds", RequirementType.FUNCTIONAL);
        requirement.setPriority(Priority.HIGH);
        requirement.setRiskLevel(RiskLevel.HIGH);
        story.addRequirement(requirement);

        Ambiguity ambiguity = new Ambiguity("Which cards are supported?", AmbiguitySeverity.MEDIUM);
        story.addAmbiguity(ambiguity);

        CoverageItem coverageItem = new CoverageItem(CoverageCategory.HAPPY_PATH, "Approved card payment");
        coverageItem.setRequirement(requirement);
        coverageItem.markCovered();
        story.addCoverageItem(coverageItem);

        TestSuite suite = new TestSuite("Checkout regression");
        suite.setTestLayer(TestLayer.UI);
        story.addTestSuite(suite);

        TestCase testCase = new TestCase("Pay by card successfully", TestCaseType.FUNCTIONAL);
        testCase.setPriority(Priority.HIGH);
        testCase.setRiskLevel(RiskLevel.HIGH);
        testCase.setReviewStatus(ReviewStatus.NEEDS_REVIEW);
        testCase.linkRequirement(requirement);
        testCase.addStep(new TestStep(1, "Submit valid card details", "Payment is authorized"));
        testCase.addTestData(new TestData("valid-card", "{\"cardNumber\":\"4111111111111111\"}"));
        testCase.addReviewEvent(new ReviewEvent(ReviewStatus.NEEDS_REVIEW, "qa.lead"));
        suite.addTestCase(testCase);

        AiJob aiJob = new AiJob("coverage-analysis");
        aiJob.setStatus(AiJobStatus.COMPLETED);
        aiJob.setInputPayloadJson("{\"storyId\":\"pending\"}");
        aiJob.setOutputPayloadJson("{\"coverage\":\"ok\"}");
        story.addAiJob(aiJob);

        ExportJob exportJob = new ExportJob("manual-test-cases");
        exportJob.setStatus(ExportStatus.PENDING);
        exportJob.setExportDetailsJson("{\"format\":\"csv\"}");
        story.addExportJob(exportJob);

        Project saved = projectRepository.saveAndFlush(project);
        UUID savedStoryId = saved.getStories().getFirst().getId();
        UUID savedTestCaseId = saved.getStories().getFirst().getTestSuites().getFirst().getTestCases().getFirst().getId();

        Story persistedStory = storyRepository.findById(savedStoryId).orElseThrow();
        TestCase persistedTestCase = testCaseRepository.findById(savedTestCaseId).orElseThrow();

        assertThat(saved.getId()).isNotNull();
        assertThat(persistedStory.getProject().getId()).isEqualTo(saved.getId());
        assertThat(persistedStory.getRequirements()).hasSize(1);
        assertThat(persistedStory.getAmbiguities()).hasSize(1);
        assertThat(persistedStory.getCoverageItems()).hasSize(1);
        assertThat(persistedStory.getTestSuites()).hasSize(1);
        assertThat(persistedStory.getAiJobs()).hasSize(1);
        assertThat(persistedStory.getExportJobs()).hasSize(1);
        assertThat(persistedTestCase.getTestSteps()).hasSize(1);
        assertThat(persistedTestCase.getTestDataEntries()).hasSize(1);
        assertThat(persistedTestCase.getReviewEvents()).hasSize(1);
        assertThat(persistedTestCase.getRequirements()).hasSize(1);
    }
}
