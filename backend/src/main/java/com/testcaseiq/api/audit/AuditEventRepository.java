package com.testcaseiq.api.audit;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    @Query("""
            SELECT e FROM AuditEvent e
            WHERE (cast(:action as String) IS NULL OR e.action = :action)
            AND (cast(:outcome as String) IS NULL OR e.outcome = :outcome)
            AND (cast(:resourceType as String) IS NULL OR e.resourceType = :resourceType)
            AND (cast(:resourceId as String) IS NULL OR e.resourceId = :resourceId)
            AND (cast(:actor as String) IS NULL OR e.actorEmail = :actor)
            AND (cast(:fromTime as Instant) IS NULL OR e.timestamp >= :fromTime)
            AND (cast(:toTime as Instant) IS NULL OR e.timestamp <= :toTime)
            ORDER BY e.timestamp DESC
            """)
    Page<AuditEvent> findWithFilters(
            @Param("action") String action,
            @Param("outcome") String outcome,
            @Param("resourceType") String resourceType,
            @Param("resourceId") String resourceId,
            @Param("actor") String actor,
            @Param("fromTime") Instant fromTime,
            @Param("toTime") Instant toTime,
            Pageable pageable
    );
}
