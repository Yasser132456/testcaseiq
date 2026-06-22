package com.testcaseiq.api.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.testcaseiq.api.domain.model.Project;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    Optional<Project> findByKey(String key);

    List<Project> findAllByOrderByCreatedAtDesc();

    List<Project> findTop3ByOrderByUpdatedAtDesc();

    List<Project> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
