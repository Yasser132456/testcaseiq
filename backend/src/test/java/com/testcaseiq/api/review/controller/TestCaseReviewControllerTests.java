package com.testcaseiq.api.review.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.Priority;
import com.testcaseiq.api.domain.enums.ReviewStatus;
import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.domain.enums.TestCaseType;
import com.testcaseiq.api.domain.enums.TestLayer;
import com.testcaseiq.api.review.dto.ReviewEventResponse;
import com.testcaseiq.api.review.dto.TestCasePriorityUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseResponse;
import com.testcaseiq.api.review.dto.TestCaseReviewStatusUpdateRequest;
import com.testcaseiq.api.review.dto.TestCaseRiskUpdateRequest;
import com.testcaseiq.api.review.service.TestCaseReviewService;

@WebMvcTest(TestCaseReviewController.class)
@AutoConfigureMockMvc(addFilters = false)
class TestCaseReviewControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TestCaseReviewService testCaseReviewService;

    @Test
    void updatesReviewStatus() throws Exception {
        UUID testCaseId = UUID.randomUUID();
        when(testCaseReviewService.updateReviewStatus(eq(testCaseId), any(TestCaseReviewStatusUpdateRequest.class)))
                .thenReturn(response(testCaseId, ReviewStatus.APPROVED, Priority.HIGH, RiskLevel.MEDIUM));

        mockMvc.perform(patch("/api/test-cases/{testCaseId}/review-status", testCaseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "APPROVED",
                                  "comment": "Looks good"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("APPROVED"));
    }

    @Test
    void rejectsMissingReviewStatus() throws Exception {
        UUID testCaseId = UUID.randomUUID();

        mockMvc.perform(patch("/api/test-cases/{testCaseId}/review-status", testCaseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "comment": "Missing status"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.status").value("Review status is required"));
    }

    @Test
    void rejectsManualExportStatus() throws Exception {
        UUID testCaseId = UUID.randomUUID();
        when(testCaseReviewService.updateReviewStatus(eq(testCaseId), any(TestCaseReviewStatusUpdateRequest.class)))
                .thenThrow(new BadRequestException("Review status EXPORTED cannot be set manually in this sprint"));

        mockMvc.perform(patch("/api/test-cases/{testCaseId}/review-status", testCaseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "EXPORTED"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Review status EXPORTED cannot be set manually in this sprint"));
    }

    @Test
    void updatesPriority() throws Exception {
        UUID testCaseId = UUID.randomUUID();
        when(testCaseReviewService.updatePriority(eq(testCaseId), any(TestCasePriorityUpdateRequest.class)))
                .thenReturn(response(testCaseId, ReviewStatus.NEEDS_REVIEW, Priority.CRITICAL, RiskLevel.MEDIUM));

        mockMvc.perform(patch("/api/test-cases/{testCaseId}/priority", testCaseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "priority": "CRITICAL"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("CRITICAL"));
    }

    @Test
    void updatesRisk() throws Exception {
        UUID testCaseId = UUID.randomUUID();
        when(testCaseReviewService.updateRisk(eq(testCaseId), any(TestCaseRiskUpdateRequest.class)))
                .thenReturn(response(testCaseId, ReviewStatus.NEEDS_REVIEW, Priority.HIGH, RiskLevel.HIGH));

        mockMvc.perform(patch("/api/test-cases/{testCaseId}/risk", testCaseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "riskLevel": "HIGH"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.riskLevel").value("HIGH"));
    }

    @Test
    void returnsReviewEvents() throws Exception {
        UUID testCaseId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        when(testCaseReviewService.getReviewEvents(testCaseId)).thenReturn(List.of(new ReviewEventResponse(
                eventId,
                testCaseId,
                ReviewStatus.APPROVED,
                "REVIEW_STATUS_UPDATED",
                "NEEDS_REVIEW",
                "APPROVED",
                "local-reviewer",
                "Looks good",
                Instant.parse("2026-06-14T00:00:00Z")
        )));

        mockMvc.perform(get("/api/test-cases/{testCaseId}/review-events", testCaseId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].actionType").value("REVIEW_STATUS_UPDATED"));
    }

    @Test
    void returnsNotFoundForMissingTestCase() throws Exception {
        UUID testCaseId = UUID.randomUUID();
        when(testCaseReviewService.updatePriority(eq(testCaseId), any(TestCasePriorityUpdateRequest.class)))
                .thenThrow(new ResourceNotFoundException("Test case not found: " + testCaseId));

        mockMvc.perform(patch("/api/test-cases/{testCaseId}/priority", testCaseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "priority": "HIGH"
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Test case not found: " + testCaseId));
    }

    private TestCaseResponse response(UUID testCaseId, ReviewStatus status, Priority priority, RiskLevel riskLevel) {
        return new TestCaseResponse(
                testCaseId,
                UUID.randomUUID(),
                "Complete primary workflow",
                "Covers the happy path.",
                TestCaseType.FUNCTIONAL,
                TestLayer.UI,
                priority,
                riskLevel,
                status,
                true,
                null,
                "Given a valid user",
                List.of("REQ-1"),
                List.of(),
                Instant.parse("2026-06-14T00:00:00Z"),
                Instant.parse("2026-06-14T00:00:00Z")
        );
    }
}
