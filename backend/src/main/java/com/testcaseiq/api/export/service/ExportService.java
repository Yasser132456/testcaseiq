package com.testcaseiq.api.export.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.ExportStatus;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.model.ExportJob;
import com.testcaseiq.api.domain.model.Requirement;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestData;
import com.testcaseiq.api.domain.model.TestStep;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.ExportJobRepository;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.domain.repository.TestSuiteRepository;
import com.testcaseiq.api.export.dto.ApprovedTestCaseExport;
import com.testcaseiq.api.export.dto.ExportFormat;
import com.testcaseiq.api.export.dto.ExportResult;
import com.testcaseiq.api.export.dto.ExportedTestData;
import com.testcaseiq.api.export.dto.ExportedTestStep;
import com.testcaseiq.api.export.dto.TestCaseExportDocument;

@Service
public class ExportService {

    private final StoryRepository storyRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final ExportJobRepository exportJobRepository;
    private final ObjectMapper objectMapper;

    public ExportService(
            StoryRepository storyRepository,
            TestSuiteRepository testSuiteRepository,
            ExportJobRepository exportJobRepository,
            ObjectMapper objectMapper
    ) {
        this.storyRepository = storyRepository;
        this.testSuiteRepository = testSuiteRepository;
        this.exportJobRepository = exportJobRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ExportResult exportStory(UUID storyId, ExportFormat format) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story not found: " + storyId));
        TestCaseExportDocument document = documentForStory(story);
        String filename = "story-%s-approved-test-cases.%s".formatted(storyId, format.extension());
        return export(story, format, filename, document);
    }

    @Transactional
    public ExportResult exportTestSuite(UUID testSuiteId, ExportFormat format) {
        TestSuite testSuite = testSuiteRepository.findById(testSuiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Test suite not found: " + testSuiteId));
        Story story = testSuite.getStory();
        TestCaseExportDocument document = documentForTestSuite(story, testSuite);
        String filename = "test-suite-%s-approved-test-cases.%s".formatted(testSuiteId, format.extension());
        return export(story, format, filename, document);
    }

    private ExportResult export(Story story, ExportFormat format, String filename, TestCaseExportDocument document) {
        ExportJob exportJob = new ExportJob("approved-test-cases-" + format.pathSegment());
        story.addExportJob(exportJob);

        try {
            String content = switch (format) {
                case MARKDOWN -> toMarkdown(document);
                case CSV -> toCsv(document);
                case JSON -> toJson(document);
            };
            exportJob.setStatus(ExportStatus.COMPLETED);
            exportJob.setExportDetailsJson(toMetadataJson(format, filename, document.testCases().size()));
            exportJobRepository.save(exportJob);
            return new ExportResult(filename, format.contentType(), content);
        } catch (RuntimeException exception) {
            exportJob.setStatus(ExportStatus.FAILED);
            exportJob.setErrorMessage(exception.getMessage());
            exportJobRepository.save(exportJob);
            throw new IllegalStateException("Unable to export approved test cases", exception);
        }
    }

    private TestCaseExportDocument documentForStory(Story story) {
        List<ApprovedTestCaseExport> testCases = story.getTestSuites().stream()
                .flatMap(testSuite -> approvedTestCases(story, testSuite).stream())
                .toList();
        return new TestCaseExportDocument(
                story.getId(),
                story.getTitle(),
                story.getExternalReference(),
                null,
                null,
                testCases
        );
    }

    private TestCaseExportDocument documentForTestSuite(Story story, TestSuite testSuite) {
        return new TestCaseExportDocument(
                story.getId(),
                story.getTitle(),
                story.getExternalReference(),
                testSuite.getId(),
                testSuite.getName(),
                approvedTestCases(story, testSuite)
        );
    }

    private List<ApprovedTestCaseExport> approvedTestCases(Story story, TestSuite testSuite) {
        return testSuite.getTestCases().stream()
                .filter(testCase -> testCase.getReviewStatus() == ReviewStatus.APPROVED)
                .map(testCase -> toExport(story, testSuite, testCase))
                .toList();
    }

    private ApprovedTestCaseExport toExport(Story story, TestSuite testSuite, TestCase testCase) {
        return new ApprovedTestCaseExport(
                story.getId(),
                story.getTitle(),
                story.getExternalReference(),
                testSuite.getId(),
                testSuite.getName(),
                testCase.getId(),
                testCase.getTitle(),
                testCase.getDescription(),
                testCase.getType(),
                testCase.getTestLayer(),
                testCase.getPriority(),
                testCase.getRiskLevel(),
                testCase.getReviewStatus(),
                testCase.isAutomationCandidate(),
                null,
                testCase.getPreconditions(),
                testCase.getTestSteps().stream()
                        .sorted(Comparator.comparingInt(TestStep::getStepOrder))
                        .map(step -> new ExportedTestStep(step.getStepOrder(), step.getAction(), step.getExpectedResult()))
                        .toList(),
                testCase.getTestDataEntries().stream()
                        .map(testData -> new ExportedTestData(testData.getName(), testData.getDataValueJson()))
                        .toList(),
                testCase.getRequirements().stream()
                        .map(Requirement::getSourceReference)
                        .filter(reference -> reference != null && !reference.isBlank())
                        .sorted()
                        .toList(),
                List.of(),
                testCase.getExpectedResult()
        );
    }

    private String toMarkdown(TestCaseExportDocument document) {
        StringBuilder markdown = new StringBuilder();
        markdown.append("# Approved Test Cases for ").append(nullToEmpty(document.storyTitle())).append("\n\n");
        markdown.append("- Story ID: ").append(document.storyId()).append("\n");
        if (hasText(document.storyReference())) {
            markdown.append("- External Reference: ").append(document.storyReference()).append("\n");
        }
        if (document.testSuiteId() != null) {
            markdown.append("- Test Suite ID: ").append(document.testSuiteId()).append("\n");
            markdown.append("- Test Suite Name: ").append(nullToEmpty(document.testSuiteName())).append("\n");
        }
        markdown.append("\n");

        if (document.testCases().isEmpty()) {
            markdown.append("No approved test cases are available for export.\n");
            return markdown.toString();
        }

        document.testCases().stream()
                .collect(Collectors.groupingBy(
                        ApprovedTestCaseExport::testSuiteName,
                        java.util.LinkedHashMap::new,
                        Collectors.toList()
                ))
                .forEach((suiteName, testCases) -> appendSuite(markdown, suiteName, testCases));

        return markdown.toString();
    }

    private void appendSuite(StringBuilder markdown, String suiteName, List<ApprovedTestCaseExport> testCases) {
        markdown.append("## ").append(nullToEmpty(suiteName)).append("\n\n");
        for (ApprovedTestCaseExport testCase : testCases) {
            markdown.append("### ").append(nullToEmpty(testCase.title())).append("\n\n");
            markdown.append("- Test Case ID: ").append(testCase.testCaseId()).append("\n");
            markdown.append("- Objective: ").append(nullToEmpty(testCase.objective())).append("\n");
            markdown.append("- Type: ").append(nullToEmpty(testCase.type())).append("\n");
            markdown.append("- Layer: ").append(nullToEmpty(testCase.layer())).append("\n");
            markdown.append("- Priority: ").append(nullToEmpty(testCase.priority())).append("\n");
            markdown.append("- Risk: ").append(nullToEmpty(testCase.risk())).append("\n");
            markdown.append("- Review Status: ").append(testCase.reviewStatus()).append("\n");
            markdown.append("- Automation Candidate: ").append(testCase.automationCandidate()).append("\n");
            markdown.append("- Confidence Score: ").append(nullToEmpty(testCase.confidenceScore())).append("\n");
            markdown.append("- Preconditions: ").append(nullToEmpty(testCase.preconditions())).append("\n");
            markdown.append("- Linked Requirements: ").append(join(testCase.linkedRequirementReferences())).append("\n");
            markdown.append("- Source Evidence: ").append(join(testCase.sourceEvidence())).append("\n");
            markdown.append("- BDD Scenario: ").append(nullToEmpty(testCase.bddScenario())).append("\n\n");
            appendSteps(markdown, testCase.steps());
            appendTestData(markdown, testCase.testData());
        }
    }

    private void appendSteps(StringBuilder markdown, List<ExportedTestStep> steps) {
        markdown.append("| Step | Action | Expected Result |\n");
        markdown.append("| --- | --- | --- |\n");
        for (ExportedTestStep step : steps) {
            markdown.append("| ")
                    .append(step.order())
                    .append(" | ")
                    .append(markdownTableCell(step.action()))
                    .append(" | ")
                    .append(markdownTableCell(step.expectedResult()))
                    .append(" |\n");
        }
        markdown.append("\n");
    }

    private void appendTestData(StringBuilder markdown, List<ExportedTestData> testDataEntries) {
        if (testDataEntries.isEmpty()) {
            markdown.append("Test Data: None\n\n");
            return;
        }
        markdown.append("Test Data:\n\n");
        for (ExportedTestData testData : testDataEntries) {
            markdown.append("- ")
                    .append(nullToEmpty(testData.name()))
                    .append(": ")
                    .append(nullToEmpty(testData.value()))
                    .append("\n");
        }
        markdown.append("\n");
    }

    private String toCsv(TestCaseExportDocument document) {
        List<String> lines = new ArrayList<>();
        lines.add(String.join(",",
                "storyTitle",
                "storyReference",
                "testSuiteName",
                "testCaseId",
                "title",
                "objective",
                "type",
                "layer",
                "priority",
                "risk",
                "reviewStatus",
                "automationCandidate",
                "confidenceScore",
                "preconditions",
                "steps",
                "testData",
                "linkedRequirementReferences",
                "sourceEvidence",
                "bddScenario"
        ));

        for (ApprovedTestCaseExport testCase : document.testCases()) {
            lines.add(java.util.Arrays.asList(
                    csv(testCase.storyTitle()),
                    csv(testCase.storyReference()),
                    csv(testCase.testSuiteName()),
                    csv(testCase.testCaseId()),
                    csv(testCase.title()),
                    csv(testCase.objective()),
                    csv(testCase.type()),
                    csv(testCase.layer()),
                    csv(testCase.priority()),
                    csv(testCase.risk()),
                    csv(testCase.reviewStatus()),
                    csv(testCase.automationCandidate()),
                    csv(testCase.confidenceScore()),
                    csv(testCase.preconditions()),
                    csv(testCase.steps().stream()
                            .map(step -> "%d. %s => %s".formatted(step.order(), step.action(), step.expectedResult()))
                            .collect(Collectors.joining(" | "))),
                    csv(testCase.testData().stream()
                            .map(testData -> "%s: %s".formatted(testData.name(), testData.value()))
                            .collect(Collectors.joining(" | "))),
                    csv(join(testCase.linkedRequirementReferences())),
                    csv(join(testCase.sourceEvidence())),
                    csv(testCase.bddScenario())
            ).stream().collect(Collectors.joining(",")));
        }

        return String.join("\n", lines) + "\n";
    }

    private String toJson(TestCaseExportDocument document) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(document);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(exception.getMessage(), exception);
        }
    }

    private String toMetadataJson(ExportFormat format, String filename, int exportedTestCaseCount) {
        try {
            return objectMapper.writeValueAsString(new ExportJobMetadata(format.pathSegment(), filename, exportedTestCaseCount));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(exception.getMessage(), exception);
        }
    }

    private String csv(Object value) {
        String text = nullToEmpty(value);
        if (text.contains("\"") || text.contains(",") || text.contains("\n") || text.contains("\r")) {
            return "\"" + text.replace("\"", "\"\"") + "\"";
        }
        return text;
    }

    private String markdownTableCell(String value) {
        return nullToEmpty(value).replace("|", "\\|").replace("\n", " ");
    }

    private String join(List<String> values) {
        return values == null || values.isEmpty() ? "" : String.join("; ", values);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String nullToEmpty(Object value) {
        return value == null ? "" : value.toString();
    }

    private record ExportJobMetadata(String format, String filename, int exportedTestCaseCount) {
    }
}
