package com.testcaseiq.api.story;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.AmbiguityResolutionStatus;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;
import com.testcaseiq.api.domain.model.Ambiguity;
import com.testcaseiq.api.domain.repository.AmbiguityRepository;
import com.testcaseiq.api.story.dto.AmbiguityResolutionRequest;
import com.testcaseiq.api.story.dto.AmbiguityResponse;

@Service
public class AmbiguityService {

    private final AmbiguityRepository ambiguityRepository;

    public AmbiguityService(AmbiguityRepository ambiguityRepository) {
        this.ambiguityRepository = ambiguityRepository;
    }

    @Transactional(readOnly = true)
    public List<AmbiguityResponse> listForStory(UUID storyId) {
        return ambiguityRepository.findByStoryIdOrderBySeverityDesc(storyId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AmbiguityResponse resolve(
            UUID storyId,
            UUID ambiguityId,
            AmbiguityResolutionRequest request,
            String actorEmail
    ) {
        Ambiguity ambiguity = findAmbiguityInStory(storyId, ambiguityId);
        if (request.status() == AmbiguityResolutionStatus.ANSWERED) {
            String notes = request.resolutionNotes();
            if (notes == null || notes.isBlank()) {
                throw new BadRequestException("Resolution notes are required when answering a clarifying question.");
            }
            ambiguity.resolve(notes, actorEmail);
        } else if (request.status() == AmbiguityResolutionStatus.DISMISSED) {
            ambiguity.dismiss(actorEmail);
        } else {
            throw new BadRequestException("Resolution status must be ANSWERED or DISMISSED.");
        }
        return toResponse(ambiguity);
    }

    @Transactional(readOnly = true)
    public long countOpenBlocking(UUID storyId) {
        return ambiguityRepository.findByStoryIdOrderBySeverityDesc(storyId)
                .stream()
                .filter(ambiguity -> ambiguity.getResolutionStatus() == AmbiguityResolutionStatus.OPEN)
                .filter(ambiguity -> ambiguity.getSeverity() == AmbiguitySeverity.CRITICAL)
                .count();
    }

    private Ambiguity findAmbiguityInStory(UUID storyId, UUID ambiguityId) {
        Ambiguity ambiguity = ambiguityRepository.findById(ambiguityId)
                .orElseThrow(() -> new ResourceNotFoundException("Ambiguity not found: " + ambiguityId));
        if (ambiguity.getStory() == null || !storyId.equals(ambiguity.getStory().getId())) {
            throw new ResourceNotFoundException("Ambiguity not found: " + ambiguityId);
        }
        return ambiguity;
    }

    private AmbiguityResponse toResponse(Ambiguity ambiguity) {
        return new AmbiguityResponse(
                ambiguity.getId(),
                ambiguity.getQuestion(),
                ambiguity.getContext(),
                ambiguity.getSeverity(),
                ambiguity.getResolutionStatus(),
                ambiguity.getResolutionNotes(),
                ambiguity.getResolvedBy(),
                ambiguity.getResolvedAt()
        );
    }
}
