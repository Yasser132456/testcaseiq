package com.testcaseiq.api.audit;

import java.time.Instant;
import java.time.format.DateTimeParseException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.common.error.BadRequestException;

@RestController
@RequestMapping("/api/audit/events")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private final AuditEventRepository auditEventRepository;

    public AuditController(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @GetMapping
    public Page<AuditEventResponse> listEvents(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String resourceType,
            @RequestParam(required = false) String resourceId,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Instant fromTime = parseInstant(from, "from");
        Instant toTime = parseInstant(to, "to");
        if (fromTime != null && toTime != null && fromTime.isAfter(toTime)) {
            throw new BadRequestException("'from' must not be after 'to'");
        }
        int safeSize = Math.min(Math.max(size, 1), 200);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by("timestamp").descending());
        return auditEventRepository
                .findWithFilters(action, outcome, resourceType, resourceId, actor, fromTime, toTime, pageable)
                .map(AuditEventResponse::from);
    }

    private Instant parseInstant(String value, String param) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Invalid ISO 8601 date for '" + param + "': " + value);
        }
    }
}
