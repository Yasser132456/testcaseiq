package com.testcaseiq.api.export.controller;

import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.audit.AuditAction;
import com.testcaseiq.api.audit.AuditOutcome;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.export.dto.ExportFormat;
import com.testcaseiq.api.export.dto.ExportResult;
import com.testcaseiq.api.export.service.ExportService;

@RestController
@RequestMapping("/api")
@PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
public class ExportController {

    private final ExportService exportService;
    private final AuditService auditService;

    public ExportController(ExportService exportService, AuditService auditService) {
        this.exportService = exportService;
        this.auditService = auditService;
    }

    @GetMapping("/stories/{storyId}/exports/markdown")
    ResponseEntity<String> exportStoryMarkdown(@PathVariable UUID storyId) {
        return auditedExport(exportService.exportStory(storyId, ExportFormat.MARKDOWN), "STORY", storyId);
    }

    @GetMapping("/stories/{storyId}/exports/csv")
    ResponseEntity<String> exportStoryCsv(@PathVariable UUID storyId) {
        return auditedExport(exportService.exportStory(storyId, ExportFormat.CSV), "STORY", storyId);
    }

    @GetMapping("/stories/{storyId}/exports/xray-csv")
    ResponseEntity<String> exportStoryXrayCsv(@PathVariable UUID storyId) {
        return auditedExport(exportService.exportStory(storyId, ExportFormat.XRAY_CSV), "STORY", storyId);
    }

    @GetMapping("/stories/{storyId}/exports/azure-devops-csv")
    ResponseEntity<String> exportStoryAzureDevOpsCsv(@PathVariable UUID storyId) {
        return auditedExport(exportService.exportStory(storyId, ExportFormat.AZURE_DEVOPS_CSV), "STORY", storyId);
    }

    @GetMapping("/stories/{storyId}/exports/json")
    ResponseEntity<String> exportStoryJson(@PathVariable UUID storyId) {
        return auditedExport(exportService.exportStory(storyId, ExportFormat.JSON), "STORY", storyId);
    }

    @GetMapping("/test-suites/{testSuiteId}/exports/markdown")
    ResponseEntity<String> exportTestSuiteMarkdown(@PathVariable UUID testSuiteId) {
        return auditedExport(exportService.exportTestSuite(testSuiteId, ExportFormat.MARKDOWN), "TEST_SUITE", testSuiteId);
    }

    @GetMapping("/test-suites/{testSuiteId}/exports/csv")
    ResponseEntity<String> exportTestSuiteCsv(@PathVariable UUID testSuiteId) {
        return auditedExport(exportService.exportTestSuite(testSuiteId, ExportFormat.CSV), "TEST_SUITE", testSuiteId);
    }

    @GetMapping("/test-suites/{testSuiteId}/exports/xray-csv")
    ResponseEntity<String> exportTestSuiteXrayCsv(@PathVariable UUID testSuiteId) {
        return auditedExport(exportService.exportTestSuite(testSuiteId, ExportFormat.XRAY_CSV), "TEST_SUITE", testSuiteId);
    }

    @GetMapping("/test-suites/{testSuiteId}/exports/json")
    ResponseEntity<String> exportTestSuiteJson(@PathVariable UUID testSuiteId) {
        return auditedExport(exportService.exportTestSuite(testSuiteId, ExportFormat.JSON), "TEST_SUITE", testSuiteId);
    }

    @GetMapping("/stories/{storyId}/exports/playwright")
    ResponseEntity<String> exportStoryPlaywright(@PathVariable UUID storyId) {
        return auditedExport(exportService.exportStory(storyId, ExportFormat.PLAYWRIGHT), "STORY", storyId);
    }

    @GetMapping("/test-suites/{testSuiteId}/exports/playwright")
    ResponseEntity<String> exportTestSuitePlaywright(@PathVariable UUID testSuiteId) {
        return auditedExport(exportService.exportTestSuite(testSuiteId, ExportFormat.PLAYWRIGHT), "TEST_SUITE", testSuiteId);
    }

    @GetMapping("/stories/{storyId}/exports/postman")
    ResponseEntity<String> exportStoryPostman(@PathVariable UUID storyId) {
        return auditedExport(exportService.exportStory(storyId, ExportFormat.POSTMAN), "STORY", storyId);
    }

    @GetMapping("/test-suites/{testSuiteId}/exports/postman")
    ResponseEntity<String> exportTestSuitePostman(@PathVariable UUID testSuiteId) {
        return auditedExport(exportService.exportTestSuite(testSuiteId, ExportFormat.POSTMAN), "TEST_SUITE", testSuiteId);
    }

    private ResponseEntity<String> auditedExport(ExportResult result, String resourceType, UUID resourceId) {
        auditService.log(AuditAction.TESTS_EXPORTED, resourceType, resourceId.toString(), AuditOutcome.SUCCESS, null);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(result.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.filename() + "\"")
                .body(result.content());
    }
}
