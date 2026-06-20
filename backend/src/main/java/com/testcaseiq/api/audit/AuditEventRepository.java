package com.testcaseiq.api.audit;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    @Query("""
            SELECT e FROM AuditEvent e
            WHERE (:action IS NULL OR e.action = :action)
            AND (:outcome IS NULL OR e.outcome = :outcome)
            AND (:resourceType IS NULL OR e.resourceType = :resourceType)
            ORDER BY e.timestamp DESC
            """)
    Page<AuditEvent> findWithFilters(
            @Param("action") String action,
            @Param("outcome") String outcome,
            @Param("resourceType") String resourceType,
            Pageable pageable
    );
}
