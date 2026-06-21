package com.testcaseiq.api.domain.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.testcaseiq.api.domain.model.Story;

public interface StoryRepository extends JpaRepository<Story, UUID> {

    List<Story> findByProjectId(UUID projectId);

    List<Story> findByProjectIdOrderByCreatedAtDesc(UUID projectId);

    @Query("SELECT COUNT(DISTINCT s) FROM Story s WHERE s.testSuites IS NOT EMPTY")
    long countStoriesWithTestSuites();
}
