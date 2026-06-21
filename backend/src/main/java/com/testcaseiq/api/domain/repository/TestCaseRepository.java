package com.testcaseiq.api.domain.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.model.TestCase;

public interface TestCaseRepository extends JpaRepository<TestCase, UUID> {

    long countByReviewStatus(ReviewStatus status);
}
