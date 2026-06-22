package com.testcaseiq.api.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.model.Project;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.model.TestSuite;
import com.testcaseiq.api.domain.repository.ProjectRepository;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.domain.repository.TestCaseRepository;
import com.testcaseiq.api.domain.repository.TestSuiteRepository;

@ExtendWith(MockitoExtension.class)
class SearchServiceTests {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private StoryRepository storyRepository;

    @Mock
    private TestSuiteRepository testSuiteRepository;

    @Mock
    private TestCaseRepository testCaseRepository;

    @Test
    void emptyQueryReturnsEmptyResultsWithoutRepositoryFanout() {
        SearchService service = service();

        SearchResultsResponse response = service.search("   ");

        assertThat(response.projects()).isEmpty();
        assertThat(response.stories()).isEmpty();
        assertThat(response.testSuites()).isEmpty();
        assertThat(response.testCases()).isEmpty();
        verifyNoInteractions(projectRepository, storyRepository, testSuiteRepository, testCaseRepository);
    }

    @Test
    void searchesEachEntityTypeWithTrimmedQueryAndCapsEachGroupAtFive() {
        Project project = project("Payments");
        Story story = story("Buyer can pay by card");
        TestSuite suite = suite(story, "Payment regression");
        TestCase testCase = testCase(suite, "Declined card shows an error");
        given(projectRepository.findByNameContainingIgnoreCase(eq("pay"), any(Pageable.class))).willReturn(List.of(project));
        given(storyRepository.findByTitleContainingIgnoreCase(eq("pay"), any(Pageable.class))).willReturn(List.of(story));
        given(testSuiteRepository.findByNameContainingIgnoreCase(eq("pay"), any(Pageable.class))).willReturn(List.of(suite));
        given(testCaseRepository.findByTitleContainingIgnoreCase(eq("pay"), any(Pageable.class))).willReturn(List.of(testCase));
        SearchService service = service();

        SearchResultsResponse response = service.search("  pay  ");

        assertThat(response.projects()).singleElement()
                .satisfies(result -> {
                    assertThat(result.id()).isEqualTo(project.getId());
                    assertThat(result.name()).isEqualTo("Payments");
                    assertThat(result.type()).isEqualTo(SearchResultType.PROJECT);
                });
        assertThat(response.stories()).singleElement()
                .satisfies(result -> {
                    assertThat(result.id()).isEqualTo(story.getId());
                    assertThat(result.title()).isEqualTo("Buyer can pay by card");
                    assertThat(result.type()).isEqualTo(SearchResultType.STORY);
                });
        assertThat(response.testSuites()).singleElement()
                .satisfies(result -> {
                    assertThat(result.id()).isEqualTo(suite.getId());
                    assertThat(result.name()).isEqualTo("Payment regression");
                    assertThat(result.type()).isEqualTo(SearchResultType.TEST_SUITE);
                });
        assertThat(response.testCases()).singleElement()
                .satisfies(result -> {
                    assertThat(result.id()).isEqualTo(testCase.getId());
                    assertThat(result.storyId()).isEqualTo(story.getId());
                    assertThat(result.title()).isEqualTo("Declined card shows an error");
                    assertThat(result.type()).isEqualTo(SearchResultType.TEST_CASE);
                });
        assertFiveItemPage(projectRepository);
        assertFiveItemPage(storyRepository);
        assertFiveItemPage(testSuiteRepository);
        assertFiveItemPage(testCaseRepository);
    }

    private SearchService service() {
        return new SearchService(projectRepository, storyRepository, testSuiteRepository, testCaseRepository);
    }

    private void assertFiveItemPage(Object repository) {
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        if (repository == projectRepository) {
            verify(projectRepository).findByNameContainingIgnoreCase(eq("pay"), captor.capture());
        } else if (repository == storyRepository) {
            verify(storyRepository).findByTitleContainingIgnoreCase(eq("pay"), captor.capture());
        } else if (repository == testSuiteRepository) {
            verify(testSuiteRepository).findByNameContainingIgnoreCase(eq("pay"), captor.capture());
        } else {
            verify(testCaseRepository).findByTitleContainingIgnoreCase(eq("pay"), captor.capture());
        }
        assertThat(captor.getValue().getPageSize()).isEqualTo(5);
    }

    private Project project(String name) {
        Project project = new Project(name, name.toUpperCase());
        setId(project);
        return project;
    }

    private Story story(String title) {
        Story story = new Story(title, StoryType.USER_STORY);
        setId(story);
        return story;
    }

    private TestSuite suite(Story story, String name) {
        TestSuite suite = new TestSuite(name);
        setId(suite);
        story.addTestSuite(suite);
        return suite;
    }

    private TestCase testCase(TestSuite suite, String title) {
        TestCase testCase = new TestCase(title, TestCaseType.FUNCTIONAL);
        setId(testCase);
        suite.addTestCase(testCase);
        return testCase;
    }

    private void setId(Object entity) {
        ReflectionTestUtils.setField(entity, "id", UUID.randomUUID());
    }
}
