package com.testcaseiq.api.domain.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.testcaseiq.api.domain.model.Story;

public interface StoryRepository extends JpaRepository<Story, UUID> {

    List<Story> findByProjectId(UUID projectId);

    List<Story> findByProjectIdOrderByCreatedAtDesc(UUID projectId);

    List<Story> findByTitleContainingIgnoreCase(String title, Pageable pageable);

    @Query("SELECT COUNT(DISTINCT s) FROM Story s WHERE s.testSuites IS NOT EMPTY")
    long countStoriesWithTestSuites();

    @Query("""
            SELECT COUNT(DISTINCT s)
            FROM Story s
            JOIN s.requirements r
            WHERE r.riskLevel IN (com.testcaseiq.api.domain.enums.RiskLevel.HIGH, com.testcaseiq.api.domain.enums.RiskLevel.CRITICAL)
            AND r.testCases IS EMPTY
            """)
    long countStoriesWithUncoveredHighRiskRequirements();
}
