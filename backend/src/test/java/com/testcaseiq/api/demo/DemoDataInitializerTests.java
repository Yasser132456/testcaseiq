package com.testcaseiq.api.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.testcaseiq.api.audit.AuditEvent;
import com.testcaseiq.api.audit.AuditEventRepository;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.model.Project;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.model.TestCase;
import com.testcaseiq.api.domain.repository.ProjectRepository;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;

class DemoDataInitializerTests {

    private final UserAccountRepository userRepo = mock(UserAccountRepository.class);
    private final ProjectRepository projectRepo = mock(ProjectRepository.class);
    private final AuditEventRepository auditRepo = mock(AuditEventRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);

    @Test
    void demoModeDefaultsToInertAndDoesNotTouchRepositories() throws Exception {
        DemoDataInitializer initializer = initializer(false);

        initializer.run(new DefaultApplicationArguments());

        verifyNoInteractions(userRepo, projectRepo, auditRepo, passwordEncoder, jdbcTemplate);
    }

    @Test
    void demoModeSkipsWhenDatabaseIsNotEmpty() throws Exception {
        given(userRepo.count()).willReturn(1L);
        given(projectRepo.count()).willReturn(0L);

        initializer(true).run(new DefaultApplicationArguments());

        verify(userRepo).count();
        verify(projectRepo).count();
        verify(userRepo, never()).saveAll(any());
        verify(projectRepo, never()).save(any(Project.class));
        verify(auditRepo, never()).saveAll(any());
    }

    @Test
    void demoModeSeedsRealisticMidSprintWorkflowWhenDatabaseIsEmpty() throws Exception {
        given(userRepo.count()).willReturn(0L);
        given(projectRepo.count()).willReturn(0L);
        given(passwordEncoder.encode("testcaseiq-demo-24A")).willReturn("encoded-password");

        initializer(true).run(new DefaultApplicationArguments());

        ArgumentCaptor<Iterable<UserAccount>> usersCaptor = ArgumentCaptor.forClass(Iterable.class);
        verify(userRepo).saveAll(usersCaptor.capture());
        List<UserAccount> users = toList(usersCaptor.getValue());
        assertThat(users).hasSize(3);
        assertThat(users).extracting(UserAccount::getDisplayName)
                .containsExactly("Mina Haddad", "Priya Raman", "Mateo Alvarez");
        assertThat(users).extracting(UserAccount::getEmail)
                .contains("demo@testcaseiq.local");
        assertThat(users).extracting(UserAccount::getPasswordHash)
                .containsOnly("encoded-password");

        ArgumentCaptor<Project> projectCaptor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepo, org.mockito.Mockito.times(3)).save(projectCaptor.capture());
        List<Project> projects = projectCaptor.getAllValues();
        assertThat(projects).extracting(Project::getName)
                .containsExactly("Harborlane Dispatch", "Willowbend Patient Portal", "Ledgerwell Payments Console");
        assertThat(projects).extracting(Project::getKey)
                .containsExactly("HARBOR", "WILLOW", "LEDGER");

        List<Story> stories = projects.stream().flatMap(project -> project.getStories().stream()).toList();
        assertThat(stories).hasSize(12);
        assertThat(stories).extracting(Story::getStatus)
                .contains(StoryStatus.DRAFT, StoryStatus.ANALYZED, StoryStatus.TESTS_GENERATED, StoryStatus.REVIEWED, StoryStatus.EXPORTED);
        assertThat(stories).extracting(Story::getTitle)
                .doesNotContain("Create project", "Sample story", "Placeholder story");

        List<TestCase> testCases = stories.stream()
                .flatMap(story -> story.getTestSuites().stream())
                .flatMap(suite -> suite.getTestCases().stream())
                .toList();
        assertThat(testCases).hasSizeGreaterThanOrEqualTo(18);
        assertThat(testCases).extracting(TestCase::getReviewStatus)
                .contains(ReviewStatus.DRAFT, ReviewStatus.NEEDS_REVIEW, ReviewStatus.APPROVED, ReviewStatus.REJECTED);
        assertThat(testCases)
                .anySatisfy(testCase -> {
                    assertThat(testCase.getReviewStatus()).isEqualTo(ReviewStatus.REJECTED);
                    assertThat(testCase.getReviewEvents()).anySatisfy(event -> assertThat(event.getComment()).isNotBlank());
                });
        assertThat(testCases).allSatisfy(testCase -> {
            assertThat(testCase.getTitle()).doesNotContain("Complete primary workflow");
            assertThat(testCase.getTestSteps()).isNotEmpty();
        });

        ArgumentCaptor<Iterable<AuditEvent>> auditCaptor = ArgumentCaptor.forClass(Iterable.class);
        verify(auditRepo).saveAll(auditCaptor.capture());
        assertThat(toList(auditCaptor.getValue())).hasSizeGreaterThanOrEqualTo(12);
    }

    @Test
    void demoModeBackfillsAuditDatesAcrossSeededTables() throws Exception {
        given(userRepo.count()).willReturn(0L);
        given(projectRepo.count()).willReturn(0L);
        given(passwordEncoder.encode(anyString())).willReturn("encoded-password");

        initializer(true).run(new DefaultApplicationArguments());

        verify(jdbcTemplate, org.mockito.Mockito.atLeastOnce()).update(
                org.mockito.Mockito.startsWith("update app_users set created_at"),
                org.mockito.Mockito.any(Object[].class)
        );
        verify(jdbcTemplate, org.mockito.Mockito.atLeastOnce()).update(
                org.mockito.Mockito.startsWith("update projects set created_at"),
                org.mockito.Mockito.any(Object[].class)
        );
        verify(jdbcTemplate, org.mockito.Mockito.atLeastOnce()).update(
                org.mockito.Mockito.startsWith("update stories set created_at"),
                org.mockito.Mockito.any(Object[].class)
        );
        verify(jdbcTemplate, org.mockito.Mockito.atLeastOnce()).update(
                org.mockito.Mockito.startsWith("update test_cases set created_at"),
                org.mockito.Mockito.any(Object[].class)
        );

        ArgumentCaptor<Object[]> argsCaptor = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate, Mockito.atLeastOnce()).update(anyString(), argsCaptor.capture());
        assertThat(argsCaptor.getAllValues())
                .allSatisfy(args -> {
                    assertThat(args[0]).isInstanceOf(Timestamp.class);
                    assertThat(args[1]).isInstanceOf(Timestamp.class);
                });
    }

    private DemoDataInitializer initializer(boolean demoMode) {
        return new DemoDataInitializer(userRepo, projectRepo, auditRepo, passwordEncoder, jdbcTemplate, demoMode);
    }

    private static <T> List<T> toList(Iterable<T> values) {
        List<T> list = new ArrayList<>();
        values.forEach(list::add);
        return list;
    }
}
