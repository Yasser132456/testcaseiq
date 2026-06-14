package com.testcaseiq.api.ai.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.ai.dto.AmbiguityDetectionResult;
import com.testcaseiq.api.ai.dto.CoverageItemDto;
import com.testcaseiq.api.ai.dto.CoveragePlanResult;
import com.testcaseiq.api.ai.dto.ExtractedAmbiguityDto;
import com.testcaseiq.api.ai.dto.ExtractedRequirementDto;
import com.testcaseiq.api.ai.dto.GeneratedTestCaseDto;
import com.testcaseiq.api.ai.dto.GeneratedTestDataDto;
import com.testcaseiq.api.ai.dto.GeneratedTestStepDto;
import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.QaValidationResult;
import com.testcaseiq.api.ai.dto.RequirementExtractionResult;
import com.testcaseiq.api.ai.dto.StoryAnalysisRequest;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.dto.TestGenerationRequest;
import com.testcaseiq.api.ai.provider.AiGenerationProvider;
import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.AiJobStatus;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.model.AiJob;
import com.testcaseiq.api.domain.model.Ambiguity;
import com.testcaseiq.api.domain.model.CoverageItem;
import com.testcaseiq.api.domain.model.Requirement;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestData;
import com.testcaseiq.api.domain.model.TestStep;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.AiJobRepository;
import com.testcaseiq.api.domain.repository.StoryRepository;

@Service
public class AiGenerationService {

    static final String ANALYSIS_JOB_TYPE = "story-analysis";
    static final String TEST_GENERATION_JOB_TYPE = "test-generation";

    private final StoryRepository storyRepository;
    private final AiJobRepository aiJobRepository;
    private final AiGenerationProvider aiGenerationProvider;
    private final ObjectMapper objectMapper;

    public AiGenerationService(
            StoryRepository storyRepository,
            AiJobRepository aiJobRepository,
            AiGenerationProvider aiGenerationProvider,
            ObjectMapper objectMapper
    ) {
        this.storyRepository = storyRepository;
        this.aiJobRepository = aiJobRepository;
        this.aiGenerationProvider = aiGenerationProvider;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public StoryAnalysisResult analyzeStory(UUID storyId) {
        Story story = findStory(storyId);
        StoryAnalysisRequest request = toAnalysisRequest(story);
        StoryAnalysisResult result = aiGenerationProvider.analyzeStory(request);

        persistAnalysis(story, result);
        story.setStatus(StoryStatus.ANALYZED);
        story.addAiJob(completedJob(ANALYSIS_JOB_TYPE, request, result));
        storyRepository.save(story);

        return result;
    }

    @Transactional
    public GeneratedTestSuiteResult generateTestCases(UUID storyId) {
        Story story = findStory(storyId);
        TestGenerationRequest request = toTestGenerationRequest(story);
        GeneratedTestSuiteResult result = aiGenerationProvider.generateTestCases(request);

        persistTestSuite(story, result);
        story.setStatus(StoryStatus.TESTS_GENERATED);
        story.addAiJob(completedJob(TEST_GENERATION_JOB_TYPE, request, result));
        storyRepository.save(story);

        return result;
    }

    @Transactional(readOnly = true)
    public StoryAnalysisResult getAnalysis(UUID storyId) {
        Story story = findStory(storyId);
        return aiJobRepository.findTopByStoryIdAndJobTypeOrderByCreatedAtDesc(storyId, ANALYSIS_JOB_TYPE)
                .map(AiJob::getOutputPayloadJson)
                .flatMap(payload -> readPayload(payload, StoryAnalysisResult.class))
                .orElseGet(() -> toPersistedAnalysisResult(story));
    }

    @Transactional(readOnly = true)
    public List<GeneratedTestSuiteResult> getTestSuites(UUID storyId) {
        Story story = findStory(storyId);
        return story.getTestSuites().stream()
                .sorted(Comparator.comparing(TestSuite::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(testSuite -> toGeneratedSuiteResult(story, testSuite))
                .toList();
    }

    private Story findStory(UUID storyId) {
        return storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story not found: " + storyId));
    }

    private StoryAnalysisRequest toAnalysisRequest(Story story) {
        return new StoryAnalysisRequest(
                story.getId(),
                story.getTitle(),
                story.getStoryText(),
                story.getType(),
                List.of()
        );
    }

    private TestGenerationRequest toTestGenerationRequest(Story story) {
        return new TestGenerationRequest(
                story.getId(),
                story.getTitle(),
                story.getStoryText(),
                story.getRequirements().stream()
                        .map(this::toExtractedRequirement)
                        .toList()
        );
    }

    private void persistAnalysis(Story story, StoryAnalysisResult result) {
        Map<String, Requirement> requirementsByReference = result.requirements().requirements().stream()
                .map(this::toRequirement)
                .peek(story::addRequirement)
                .collect(Collectors.toMap(
                        Requirement::getSourceReference,
                        Function.identity(),
                        (left, right) -> left
                ));

        result.ambiguities().ambiguities().stream()
                .map(this::toAmbiguity)
                .forEach(story::addAmbiguity);

        result.coveragePlan().coverageItems().stream()
                .map(item -> toCoverageItem(item, requirementsByReference))
                .forEach(story::addCoverageItem);
    }

    private Requirement toRequirement(ExtractedRequirementDto dto) {
        Requirement requirement = new Requirement(dto.title(), dto.type());
        requirement.setDescription(dto.description());
        requirement.setPriority(dto.priority());
        requirement.setRiskLevel(dto.riskLevel());
        requirement.setSourceReference(dto.reference());
        return requirement;
    }

    private Ambiguity toAmbiguity(ExtractedAmbiguityDto dto) {
        Ambiguity ambiguity = new Ambiguity(dto.question(), dto.severity());
        ambiguity.setContext(dto.context());
        return ambiguity;
    }

    private CoverageItem toCoverageItem(CoverageItemDto dto, Map<String, Requirement> requirementsByReference) {
        CoverageItem coverageItem = new CoverageItem(dto.category(), dto.description());
        coverageItem.setRiskLevel(dto.riskLevel());
        if (dto.requirementReference() != null) {
            coverageItem.setRequirement(requirementsByReference.get(dto.requirementReference()));
        }
        return coverageItem;
    }

    private void persistTestSuite(Story story, GeneratedTestSuiteResult result) {
        Map<String, Requirement> requirementsByReference = story.getRequirements().stream()
                .filter(requirement -> requirement.getSourceReference() != null)
                .collect(Collectors.toMap(
                        Requirement::getSourceReference,
                        Function.identity(),
                        (left, right) -> left
                ));

        TestSuite testSuite = new TestSuite(result.suiteName());
        testSuite.setDescription("Generated by the mock AI provider.");

        result.testCases().stream()
                .map(testCase -> toTestCase(testCase, requirementsByReference))
                .forEach(testSuite::addTestCase);

        story.addTestSuite(testSuite);
    }

    private TestCase toTestCase(GeneratedTestCaseDto dto, Map<String, Requirement> requirementsByReference) {
        TestCase testCase = new TestCase(dto.title(), dto.type());
        testCase.setDescription(dto.description());
        testCase.setTestLayer(dto.testLayer());
        testCase.setPriority(dto.priority());
        testCase.setRiskLevel(dto.riskLevel());
        testCase.setReviewStatus(ReviewStatus.NEEDS_REVIEW);
        testCase.setExpectedResult(dto.bddScenario());
        testCase.setAutomationCandidate(dto.automationCandidate());

        dto.steps().stream()
                .map(step -> new TestStep(step.order(), step.action(), step.expectedResult()))
                .forEach(testCase::addStep);

        dto.testData().stream()
                .map(testData -> new TestData(testData.name(), testData.valueJson()))
                .forEach(testCase::addTestData);

        dto.linkedRequirementReferences().stream()
                .map(requirementsByReference::get)
                .filter(requirement -> requirement != null)
                .forEach(testCase::linkRequirement);

        return testCase;
    }

    private AiJob completedJob(String jobType, Object input, Object output) {
        AiJob aiJob = new AiJob(jobType);
        aiJob.setStatus(AiJobStatus.COMPLETED);
        aiJob.setInputPayloadJson(toJson(input));
        aiJob.setOutputPayloadJson(toJson(output));
        return aiJob;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize AI payload", exception);
        }
    }

    private <T> java.util.Optional<T> readPayload(String payload, Class<T> type) {
        try {
            return java.util.Optional.of(objectMapper.readValue(payload, type));
        } catch (JsonProcessingException exception) {
            return java.util.Optional.empty();
        }
    }

    private StoryAnalysisResult toPersistedAnalysisResult(Story story) {
        return new StoryAnalysisResult(
                story.getId(),
                null,
                null,
                new RequirementExtractionResult(story.getRequirements().stream()
                        .map(this::toExtractedRequirement)
                        .toList(), List.of()),
                new AmbiguityDetectionResult(story.getAmbiguities().stream()
                        .map(this::toExtractedAmbiguity)
                        .toList()),
                new CoveragePlanResult(story.getCoverageItems().stream()
                        .map(this::toCoverageItemDto)
                        .toList()),
                new QaValidationResult(0.0, 0.0, List.of()),
                "persisted-domain",
                null
        );
    }

    private ExtractedRequirementDto toExtractedRequirement(Requirement requirement) {
        return new ExtractedRequirementDto(
                requirement.getSourceReference(),
                requirement.getTitle(),
                requirement.getDescription(),
                requirement.getType(),
                requirement.getPriority(),
                requirement.getRiskLevel()
        );
    }

    private ExtractedAmbiguityDto toExtractedAmbiguity(Ambiguity ambiguity) {
        return new ExtractedAmbiguityDto(
                ambiguity.getQuestion(),
                ambiguity.getContext(),
                ambiguity.getSeverity()
        );
    }

    private CoverageItemDto toCoverageItemDto(CoverageItem coverageItem) {
        Requirement requirement = coverageItem.getRequirement();
        return new CoverageItemDto(
                requirement == null ? null : requirement.getSourceReference(),
                coverageItem.getCategory(),
                coverageItem.getDescription(),
                coverageItem.getRiskLevel()
        );
    }

    private GeneratedTestSuiteResult toGeneratedSuiteResult(Story story, TestSuite testSuite) {
        return new GeneratedTestSuiteResult(
                story.getId(),
                testSuite.getName(),
                testSuite.getTestCases().stream()
                        .map(this::toGeneratedTestCase)
                        .toList(),
                new QaValidationResult(0.0, 0.0, List.of()),
                "persisted-domain",
                testSuite.getCreatedAt()
        );
    }

    private GeneratedTestCaseDto toGeneratedTestCase(TestCase testCase) {
        return new GeneratedTestCaseDto(
                testCase.getTitle(),
                testCase.getDescription(),
                testCase.getType(),
                testCase.getTestLayer(),
                testCase.getPriority(),
                testCase.getRiskLevel(),
                false,
                0.0,
                testCase.getExpectedResult(),
                testCase.getRequirements().stream()
                        .map(Requirement::getSourceReference)
                        .filter(reference -> reference != null)
                        .toList(),
                testCase.getTestSteps().stream()
                        .map(this::toGeneratedTestStep)
                        .toList(),
                testCase.getTestDataEntries().stream()
                        .map(this::toGeneratedTestData)
                        .toList()
        );
    }

    private GeneratedTestStepDto toGeneratedTestStep(TestStep testStep) {
        return new GeneratedTestStepDto(
                testStep.getStepOrder(),
                testStep.getAction(),
                testStep.getExpectedResult()
        );
    }

    private GeneratedTestDataDto toGeneratedTestData(TestData testData) {
        return new GeneratedTestDataDto(testData.getName(), testData.getDataValueJson());
    }
}
