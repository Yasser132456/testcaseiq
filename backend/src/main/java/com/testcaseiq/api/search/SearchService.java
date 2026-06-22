package com.testcaseiq.api.search;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.domain.repository.ProjectRepository;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.domain.repository.TestCaseRepository;
import com.testcaseiq.api.domain.repository.TestSuiteRepository;

@Service
public class SearchService {

    private static final int GROUP_LIMIT = 5;

    private final ProjectRepository projectRepository;
    private final StoryRepository storyRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final TestCaseRepository testCaseRepository;

    public SearchService(
            ProjectRepository projectRepository,
            StoryRepository storyRepository,
            TestSuiteRepository testSuiteRepository,
            TestCaseRepository testCaseRepository
    ) {
        this.projectRepository = projectRepository;
        this.storyRepository = storyRepository;
        this.testSuiteRepository = testSuiteRepository;
        this.testCaseRepository = testCaseRepository;
    }

    @Transactional(readOnly = true)
    public SearchResultsResponse search(String query) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isEmpty()) {
            return SearchResultsResponse.empty();
        }
        PageRequest limit = PageRequest.of(0, GROUP_LIMIT);
        List<ProjectSearchResult> projects = projectRepository.findByNameContainingIgnoreCase(trimmed, limit).stream()
                .map(project -> new ProjectSearchResult(project.getId(), project.getName(), SearchResultType.PROJECT))
                .toList();
        List<StorySearchResult> stories = storyRepository.findByTitleContainingIgnoreCase(trimmed, limit).stream()
                .map(story -> new StorySearchResult(story.getId(), story.getTitle(), SearchResultType.STORY))
                .toList();
        List<TestSuiteSearchResult> testSuites = testSuiteRepository.findByNameContainingIgnoreCase(trimmed, limit).stream()
                .map(suite -> new TestSuiteSearchResult(suite.getId(), suite.getName(), SearchResultType.TEST_SUITE))
                .toList();
        List<TestCaseSearchResult> testCases = testCaseRepository.findByTitleContainingIgnoreCase(trimmed, limit).stream()
                .map(testCase -> new TestCaseSearchResult(
                        testCase.getId(),
                        testCase.getTestSuite().getStory().getId(),
                        testCase.getTitle(),
                        SearchResultType.TEST_CASE
                ))
                .toList();
        return new SearchResultsResponse(projects, stories, testSuites, testCases);
    }
}
