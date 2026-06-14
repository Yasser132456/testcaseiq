package com.testcaseiq.api.domain.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.testcaseiq.api.domain.model.TestStep;

public interface TestStepRepository extends JpaRepository<TestStep, UUID> {
}
