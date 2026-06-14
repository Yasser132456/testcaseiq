package com.testcaseiq.api.export.controller;

import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.export.dto.ExportFormat;
import com.testcaseiq.api.export.dto.ExportResult;
import com.testcaseiq.api.export.service.ExportService;

@RestController
@RequestMapping("/api")
public class ExportController {

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping("/stories/{storyId}/exports/markdown")
    ResponseEntity<String> exportStoryMarkdown(@PathVariable UUID storyId) {
        return downloadable(exportService.exportStory(storyId, ExportFormat.MARKDOWN));
    }

    @GetMapping("/stories/{storyId}/exports/csv")
    ResponseEntity<String> exportStoryCsv(@PathVariable UUID storyId) {
        return downloadable(exportService.exportStory(storyId, ExportFormat.CSV));
    }

    @GetMapping("/stories/{storyId}/exports/json")
    ResponseEntity<String> exportStoryJson(@PathVariable UUID storyId) {
        return downloadable(exportService.exportStory(storyId, ExportFormat.JSON));
    }

    @GetMapping("/test-suites/{testSuiteId}/exports/markdown")
    ResponseEntity<String> exportTestSuiteMarkdown(@PathVariable UUID testSuiteId) {
        return downloadable(exportService.exportTestSuite(testSuiteId, ExportFormat.MARKDOWN));
    }

    @GetMapping("/test-suites/{testSuiteId}/exports/csv")
    ResponseEntity<String> exportTestSuiteCsv(@PathVariable UUID testSuiteId) {
        return downloadable(exportService.exportTestSuite(testSuiteId, ExportFormat.CSV));
    }

    @GetMapping("/test-suites/{testSuiteId}/exports/json")
    ResponseEntity<String> exportTestSuiteJson(@PathVariable UUID testSuiteId) {
        return downloadable(exportService.exportTestSuite(testSuiteId, ExportFormat.JSON));
    }

    private ResponseEntity<String> downloadable(ExportResult result) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(result.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.filename() + "\"")
                .body(result.content());
    }
}
