package com.testcaseiq.api.domain.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.testcaseiq.api.domain.model.AiJob;

public interface AiJobRepository extends JpaRepository<AiJob, UUID> {

    Optional<AiJob> findTopByStoryIdAndJobTypeOrderByCreatedAtDesc(UUID storyId, String jobType);
}
