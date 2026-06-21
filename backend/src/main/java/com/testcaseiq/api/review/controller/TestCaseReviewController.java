package com.testcaseiq.api.review.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.audit.AuditAction;
import com.testcaseiq.api.audit.AuditOutcome;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.review.dto.ReviewEventResponse;
import com.testcaseiq.api.review.dto.TestCaseAutomationCandidateUpdateRequest;
import com.testcaseiq.api.review.dto.TestCasePriorityUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseResponse;
import com.testcaseiq.api.review.dto.TestCaseReviewStatusUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseRiskUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseUpdateRequest;
import com.testcaseiq.api.review.service.TestCaseReviewService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/test-cases/{testCaseId}")
public class TestCaseReviewController {

    private final TestCaseReviewService testCaseReviewService;
    private final AuditService auditService;

    public TestCaseReviewController(TestCaseReviewService testCaseReviewService, AuditService auditService) {
        this.testCaseReviewService = testCaseReviewService;
        this.auditService = auditService;
    }

    @PatchMapping("/review-status")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updateReviewStatus(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCaseReviewStatusUpdateRequest request
    ) {
        TestCaseResponse response = testCaseReviewService.updateReviewStatus(testCaseId, request);
        boolean isDecision = request.status() == ReviewStatus.APPROVED || request.status() == ReviewStatus.REJECTED;
        AuditAction action = isDecision ? AuditAction.TEST_CASE_STATUS_CHANGED : AuditAction.TEST_CASE_UPDATED;
        Map<String, String> metadata = isDecision
                ? Map.of("reviewDecision", request.status().name())
                : Map.of();
        auditService.log(action, "TEST_CASE", testCaseId.toString(), AuditOutcome.SUCCESS, null, metadata);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/priority")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updatePriority(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCasePriorityUpdateRequest request
    ) {
        TestCaseResponse response = testCaseReviewService.updatePriority(testCaseId, request);
        auditService.log(AuditAction.TEST_CASE_UPDATED, "TEST_CASE", testCaseId.toString(), AuditOutcome.SUCCESS, null);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/risk")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updateRisk(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCaseRiskUpdateRequest request
    ) {
        TestCaseResponse response = testCaseReviewService.updateRisk(testCaseId, request);
        auditService.log(AuditAction.TEST_CASE_UPDATED, "TEST_CASE", testCaseId.toString(), AuditOutcome.SUCCESS, null);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/automation-candidate")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updateAutomationCandidate(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCaseAutomationCandidateUpdateRequest request
    ) {
        TestCaseResponse response = testCaseReviewService.updateAutomationCandidate(testCaseId, request);
        auditService.log(AuditAction.TEST_CASE_UPDATED, "TEST_CASE", testCaseId.toString(), AuditOutcome.SUCCESS, null);
        return ResponseEntity.ok(response);
    }

    @PatchMapping
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updateTestCase(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCaseUpdateRequest request
    ) {
        TestCaseResponse response = testCaseReviewService.updateTestCase(testCaseId, request);
        auditService.log(AuditAction.TEST_CASE_UPDATED, "TEST_CASE", testCaseId.toString(), AuditOutcome.SUCCESS, null);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/review-events")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public ResponseEntity<List<ReviewEventResponse>> getReviewEvents(@PathVariable UUID testCaseId) {
        return ResponseEntity.ok(testCaseReviewService.getReviewEvents(testCaseId));
    }
}
