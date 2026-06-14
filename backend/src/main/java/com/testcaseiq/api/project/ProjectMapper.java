package com.testcaseiq.api.project;

import com.testcaseiq.api.domain.model.Project;

final class ProjectMapper {

    private ProjectMapper() {
    }

    static ProjectResponse toResponse(Project project) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getKey(),
                project.getDescription(),
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }
}
