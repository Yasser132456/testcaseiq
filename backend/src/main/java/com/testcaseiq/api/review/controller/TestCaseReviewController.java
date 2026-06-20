package com.testcaseiq.api.review.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    public TestCaseReviewController(TestCaseReviewService testCaseReviewService) {
        this.testCaseReviewService = testCaseReviewService;
    }

    @PatchMapping("/review-status")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updateReviewStatus(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCaseReviewStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(testCaseReviewService.updateReviewStatus(testCaseId, request));
    }

    @PatchMapping("/priority")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updatePriority(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCasePriorityUpdateRequest request
    ) {
        return ResponseEntity.ok(testCaseReviewService.updatePriority(testCaseId, request));
    }

    @PatchMapping("/risk")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updateRisk(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCaseRiskUpdateRequest request
    ) {
        return ResponseEntity.ok(testCaseReviewService.updateRisk(testCaseId, request));
    }

    @PatchMapping("/automation-candidate")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updateAutomationCandidate(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCaseAutomationCandidateUpdateRequest request
    ) {
        return ResponseEntity.ok(testCaseReviewService.updateAutomationCandidate(testCaseId, request));
    }

    @PatchMapping
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<TestCaseResponse> updateTestCase(
            @PathVariable UUID testCaseId,
            @Valid @RequestBody TestCaseUpdateRequest request
    ) {
        return ResponseEntity.ok(testCaseReviewService.updateTestCase(testCaseId, request));
    }

    @GetMapping("/review-events")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public ResponseEntity<List<ReviewEventResponse>> getReviewEvents(@PathVariable UUID testCaseId) {
        return ResponseEntity.ok(testCaseReviewService.getReviewEvents(testCaseId));
    }
}
