package com.testcaseiq.api.domain.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.model.TestCase;

public interface TestCaseRepository extends JpaRepository<TestCase, UUID> {

    long countByReviewStatus(ReviewStatus status);

    List<TestCase> findByTitleContainingIgnoreCase(String title, Pageable pageable);
}
