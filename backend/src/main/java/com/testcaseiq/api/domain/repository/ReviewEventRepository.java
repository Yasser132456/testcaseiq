package com.testcaseiq.api.domain.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.testcaseiq.api.domain.model.ReviewEvent;

public interface ReviewEventRepository extends JpaRepository<ReviewEvent, UUID> {

    List<ReviewEvent> findByTestCaseIdOrderByCreatedAtDesc(UUID testCaseId);
}
