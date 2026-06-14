package com.testcaseiq.api.story;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.model.Project;
import com.testcaseiq.api.domain.model.Story;
import com.testcaseiq.api.domain.repository.StoryRepository;
import com.testcaseiq.api.project.ProjectService;

@Service
public class StoryService {

    private final ProjectService projectService;
    private final StoryRepository storyRepository;

    public StoryService(ProjectService projectService, StoryRepository storyRepository) {
        this.projectService = projectService;
        this.storyRepository = storyRepository;
    }

    @Transactional
    public StoryResponse create(UUID projectId, StoryCreateRequest request) {
        Project project = projectService.findProject(projectId);
        Story story = new Story(request.title(), request.type());
        story.setStoryText(request.rawText());
        story.setStatus(StoryStatus.DRAFT);
        story.setExternalReference(request.externalReference());
        story.setMetadataJson(request.metadataJson());
        project.addStory(story);
        return StoryMapper.toResponse(storyRepository.save(story));
    }

    @Transactional(readOnly = true)
    public List<StoryResponse> listForProject(UUID projectId) {
        projectService.findProject(projectId);
        return storyRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(StoryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StoryResponse get(UUID storyId) {
        return StoryMapper.toResponse(findStory(storyId));
    }

    @Transactional
    public StoryResponse update(UUID storyId, StoryUpdateRequest request) {
        Story story = findStory(storyId);
        if (request.title() != null) {
            story.setTitle(request.title());
        }
        if (request.rawText() != null) {
            story.setStoryText(request.rawText());
        }
        if (request.type() != null) {
            story.setType(request.type());
        }
        if (request.status() != null) {
            story.setStatus(request.status());
        }
        if (request.externalReference() != null) {
            story.setExternalReference(request.externalReference());
        }
        if (request.metadataJson() != null) {
            story.setMetadataJson(request.metadataJson());
        }
        return StoryMapper.toResponse(story);
    }

    @Transactional
    public void delete(UUID storyId) {
        Story story = findStory(storyId);
        storyRepository.delete(story);
    }

    private Story findStory(UUID storyId) {
        return storyRepository.findById(storyId)
                .orElseThrow(() -> new ResourceNotFoundException("Story not found: " + storyId));
    }
}
