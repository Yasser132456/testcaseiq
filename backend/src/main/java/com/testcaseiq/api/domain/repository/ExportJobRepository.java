package com.testcaseiq.api.domain.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.testcaseiq.api.domain.model.ExportJob;

public interface ExportJobRepository extends JpaRepository<ExportJob, UUID> {
}
