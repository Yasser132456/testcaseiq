package com.testcaseiq.api.domain.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.testcaseiq.api.domain.model.Ambiguity;

public interface AmbiguityRepository extends JpaRepository<Ambiguity, UUID> {

    List<Ambiguity> findByStoryIdOrderBySeverityDesc(UUID storyId);
}
