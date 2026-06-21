package com.testcaseiq.api.settings;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AppSettingsRepository extends JpaRepository<AppSettings, UUID> {

    @Query("SELECT s FROM AppSettings s ORDER BY s.updatedAt ASC")
    Optional<AppSettings> findFirst();
}
