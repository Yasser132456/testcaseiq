package com.testcaseiq.api.domain.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.model.TestSuite;

public interface TestSuiteRepository extends JpaRepository<TestSuite, UUID> {

    List<TestSuite> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Query(value = "SELECT e FROM TestSuite e WHERE " +
                   "(:storyId IS NULL OR e.story.id = :storyId) AND " +
                   "(:projectId IS NULL OR e.story.project.id = :projectId) AND " +
                   "(:approvedOnly = false OR EXISTS (" +
                   "  SELECT tc FROM TestCase tc WHERE tc.testSuite = e AND tc.reviewStatus = :approvedStatus" +
                   ")) " +
                   "ORDER BY e.createdAt DESC",
           countQuery = "SELECT COUNT(e) FROM TestSuite e WHERE " +
                        "(:storyId IS NULL OR e.story.id = :storyId) AND " +
                        "(:projectId IS NULL OR e.story.project.id = :projectId) AND " +
                        "(:approvedOnly = false OR EXISTS (" +
                        "  SELECT tc FROM TestCase tc WHERE tc.testSuite = e AND tc.reviewStatus = :approvedStatus" +
                        "))")
    Page<TestSuite> findWithFilters(
            @Param("storyId") UUID storyId,
            @Param("projectId") UUID projectId,
            @Param("approvedOnly") boolean approvedOnly,
            @Param("approvedStatus") ReviewStatus approvedStatus,
            Pageable pageable
    );
}
