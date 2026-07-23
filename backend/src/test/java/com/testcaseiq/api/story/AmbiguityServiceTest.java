package com.testcaseiq.api.story;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.AmbiguityResolutionStatus;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;
import com.testcaseiq.api.domain.enums.StoryType;
import com.testcaseiq.api.domain.model.Ambiguity;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.repository.AmbiguityRepository;
import com.testcaseiq.api.story.dto.AmbiguityResolutionRequest;
import com.testcaseiq.api.story.dto.AmbiguityResponse;

@ExtendWith(MockitoExtension.class)
class AmbiguityServiceTest {

    @Mock
    private AmbiguityRepository ambiguityRepository;

    private AmbiguityService ambiguityService;

    @BeforeEach
    void setUp() {
        ambiguityService = new AmbiguityService(ambiguityRepository);
    }

    @Test
    void resolveAnsweredSetsActorTimeAndNotes() {
        UUID storyId = UUID.randomUUID();
        Ambiguity ambiguity = ambiguity(storyId, AmbiguitySeverity.CRITICAL);
        when(ambiguityRepository.findById(ambiguity.getId())).thenReturn(Optional.of(ambiguity));

        AmbiguityResponse response = ambiguityService.resolve(
                storyId,
                ambiguity.getId(),
                new AmbiguityResolutionRequest("Use production checkout fields.", AmbiguityResolutionStatus.ANSWERED),
                "qa@test.com"
        );

        assertThat(response.status()).isEqualTo(AmbiguityResolutionStatus.ANSWERED);
        assertThat(response.resolutionNotes()).isEqualTo("Use production checkout fields.");
        assertThat(response.resolvedBy()).isEqualTo("qa@test.com");
        assertThat(response.resolvedAt()).isNotNull();
        assertThat(ambiguity.isResolved()).isTrue();
        assertThat(ambiguity.getResolvedAt()).isAfterOrEqualTo(Instant.now().minusSeconds(5));
    }

    @Test
    void resolveAnsweredRejectsBlankNotes() {
        UUID storyId = UUID.randomUUID();
        Ambiguity ambiguity = ambiguity(storyId, AmbiguitySeverity.CRITICAL);
        when(ambiguityRepository.findById(ambiguity.getId())).thenReturn(Optional.of(ambiguity));

        assertThatThrownBy(() -> ambiguityService.resolve(
                storyId,
                ambiguity.getId(),
                new AmbiguityResolutionRequest("  ", AmbiguityResolutionStatus.ANSWERED),
                "qa@test.com"
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Resolution notes are required when answering a clarifying question.");
    }

    @Test
    void resolveRejectsAmbiguityFromAnotherStory() {
        UUID storyId = UUID.randomUUID();
        Ambiguity ambiguity = ambiguity(UUID.randomUUID(), AmbiguitySeverity.CRITICAL);
        when(ambiguityRepository.findById(ambiguity.getId())).thenReturn(Optional.of(ambiguity));

        assertThatThrownBy(() -> ambiguityService.resolve(
                storyId,
                ambiguity.getId(),
                new AmbiguityResolutionRequest("Answered.", AmbiguityResolutionStatus.ANSWERED),
                "qa@test.com"
        ))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Ambiguity not found: " + ambiguity.getId());
    }

    @Test
    void countOpenBlockingCountsOnlyOpenCriticalAmbiguities() {
        UUID storyId = UUID.randomUUID();
        Ambiguity openCritical = ambiguity(storyId, AmbiguitySeverity.CRITICAL);
        Ambiguity answeredCritical = ambiguity(storyId, AmbiguitySeverity.CRITICAL);
        answeredCritical.resolve("Known.", "qa@test.com");
        Ambiguity openHigh = ambiguity(storyId, AmbiguitySeverity.HIGH);
        when(ambiguityRepository.findByStoryIdOrderBySeverityDesc(storyId))
                .thenReturn(List.of(openCritical, answeredCritical, openHigh));

        long count = ambiguityService.countOpenBlocking(storyId);

        assertThat(count).isEqualTo(1);
    }

    private Ambiguity ambiguity(UUID storyId, AmbiguitySeverity severity) {
        Story story = new Story("Checkout", StoryType.USER_STORY);
        ReflectionTestUtils.setField(story, "id", storyId);
        Ambiguity ambiguity = new Ambiguity("Which fields are required?", severity);
        ambiguity.setContext("The story omits validation details.");
        ReflectionTestUtils.setField(ambiguity, "id", UUID.randomUUID());
        story.addAmbiguity(ambiguity);
        return ambiguity;
    }
}
