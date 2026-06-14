package com.testcaseiq.api.story;

import com.testcaseiq.api.domain.model.Story;

final class StoryMapper {

    private StoryMapper() {
    }

    static StoryResponse toResponse(Story story) {
        return new StoryResponse(
                story.getId(),
                story.getProject().getId(),
                story.getTitle(),
                story.getStoryText(),
                story.getType(),
                story.getStatus(),
                story.getExternalReference(),
                story.getMetadataJson(),
                story.getCreatedAt(),
                story.getUpdatedAt()
        );
    }
}
