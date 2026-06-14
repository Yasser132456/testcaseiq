package com.testcaseiq.api.project;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.model.Project;
import com.testcaseiq.api.domain.repository.ProjectRepository;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Transactional
    public ProjectResponse create(ProjectCreateRequest request) {
        Project project = new Project(request.name(), resolveKey(request));
        project.setDescription(request.description());
        return ProjectMapper.toResponse(projectRepository.save(project));
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list() {
        return projectRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(ProjectMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(UUID projectId) {
        return ProjectMapper.toResponse(findProject(projectId));
    }

    @Transactional
    public ProjectResponse update(UUID projectId, ProjectUpdateRequest request) {
        Project project = findProject(projectId);
        if (request.name() != null) {
            project.setName(request.name());
        }
        if (request.key() != null) {
            project.setKey(normalizeKey(request.key()));
        }
        if (request.description() != null) {
            project.setDescription(request.description());
        }
        return ProjectMapper.toResponse(project);
    }

    @Transactional
    public void delete(UUID projectId) {
        Project project = findProject(projectId);
        projectRepository.delete(project);
    }

    public Project findProject(UUID projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
    }

    private String resolveKey(ProjectCreateRequest request) {
        if (request.key() != null && !request.key().isBlank()) {
            return normalizeKey(request.key());
        }
        return normalizeKey(request.name());
    }

    private String normalizeKey(String value) {
        String normalized = value.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (normalized.isBlank()) {
            return "project";
        }
        return normalized.length() > 64 ? normalized.substring(0, 64) : normalized;
    }
}
