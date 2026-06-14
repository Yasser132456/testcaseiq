package com.testcaseiq.api.story;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class StoryController {

    private final StoryService storyService;

    public StoryController(StoryService storyService) {
        this.storyService = storyService;
    }

    @PostMapping("/projects/{projectId}/stories")
    public ResponseEntity<StoryResponse> create(
            @PathVariable UUID projectId,
            @Valid @RequestBody StoryCreateRequest request
    ) {
        StoryResponse response = storyService.create(projectId, request);
        return ResponseEntity.created(URI.create("/api/stories/" + response.id())).body(response);
    }

    @GetMapping("/projects/{projectId}/stories")
    public List<StoryResponse> listForProject(@PathVariable UUID projectId) {
        return storyService.listForProject(projectId);
    }

    @GetMapping("/stories/{storyId}")
    public StoryResponse get(@PathVariable UUID storyId) {
        return storyService.get(storyId);
    }

    @PatchMapping("/stories/{storyId}")
    public StoryResponse update(@PathVariable UUID storyId, @Valid @RequestBody StoryUpdateRequest request) {
        return storyService.update(storyId, request);
    }

    @DeleteMapping("/stories/{storyId}")
    public ResponseEntity<Void> delete(@PathVariable UUID storyId) {
        storyService.delete(storyId);
        return ResponseEntity.noContent().build();
    }
}
