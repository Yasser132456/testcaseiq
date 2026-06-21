package com.testcaseiq.api.testsuite.controller;

import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.audit.AuditAction;
import com.testcaseiq.api.audit.AuditOutcome;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.testsuite.dto.TestSuiteDetailResponse;
import com.testcaseiq.api.testsuite.dto.TestSuiteResponse;
import com.testcaseiq.api.testsuite.dto.TestSuiteUpdateRequest;
import com.testcaseiq.api.testsuite.service.TestSuiteService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/test-suites")
public class TestSuiteController {

    private final TestSuiteService testSuiteService;
    private final AuditService auditService;

    public TestSuiteController(TestSuiteService testSuiteService, AuditService auditService) {
        this.testSuiteService = testSuiteService;
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public ResponseEntity<Page<TestSuiteResponse>> listSuites(
            @RequestParam(required = false) UUID storyId,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(defaultValue = "false") boolean approvedOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(testSuiteService.listSuites(storyId, projectId, approvedOnly, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public ResponseEntity<TestSuiteDetailResponse> getSuite(@PathVariable UUID id) {
        return ResponseEntity.ok(testSuiteService.getSuiteDetail(id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestSuiteResponse> updateSuite(
            @PathVariable UUID id,
            @Valid @RequestBody TestSuiteUpdateRequest request
    ) {
        TestSuiteResponse response = testSuiteService.updateSuite(id, request);
        auditService.log(AuditAction.TEST_SUITE_UPDATED, "TEST_SUITE", id.toString(), AuditOutcome.SUCCESS, null,
                Map.of("storyId", response.storyId().toString()));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("!@securityEnforcement.isEnforced() or hasRole('ADMIN')")
    public ResponseEntity<Void> deleteSuite(@PathVariable UUID id) {
        UUID storyId = testSuiteService.deleteSuite(id);
        auditService.log(AuditAction.TEST_SUITE_DELETED, "TEST_SUITE", id.toString(), AuditOutcome.SUCCESS, null,
                Map.of("storyId", storyId.toString()));
        return ResponseEntity.noContent().build();
    }
}
