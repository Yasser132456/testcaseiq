package com.testcaseiq.api.domain.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.testcaseiq.api.domain.model.Story;

public interface StoryRepository extends JpaRepository<Story, UUID> {

    List<Story> findByProjectId(UUID projectId);
}
