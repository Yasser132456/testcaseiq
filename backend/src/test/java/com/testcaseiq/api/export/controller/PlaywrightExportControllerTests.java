package com.testcaseiq.api.export.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.export.dto.ExportFormat;
import com.testcaseiq.api.export.dto.ExportResult;
import com.testcaseiq.api.export.service.ExportService;

@WebMvcTest(ExportController.class)
class PlaywrightExportControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExportService exportService;

    @Test
    void exportsStoryApprovedTestCasesAsPlaywrightDownload() throws Exception {
        UUID storyId = UUID.randomUUID();
        String filename = "story-" + storyId + "-approved-test-cases.spec.ts";
        String body = "import { test, expect } from '@playwright/test';\n\ntest.describe('Checkout', () => {});\n";

        when(exportService.exportStory(storyId, ExportFormat.PLAYWRIGHT))
                .thenReturn(new ExportResult(filename, "text/plain", body));

        mockMvc.perform(get("/api/stories/{storyId}/exports/playwright", storyId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/plain"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""))
                .andExpect(content().string(body));
    }

    @Test
    void playwrightStoryExportResponseHasSpecTsFilename() throws Exception {
        UUID storyId = UUID.randomUUID();
        String filename = "story-" + storyId + "-approved-test-cases.spec.ts";

        when(exportService.exportStory(storyId, ExportFormat.PLAYWRIGHT))
                .thenReturn(new ExportResult(filename, "text/plain", ""));

        mockMvc.perform(get("/api/stories/{storyId}/exports/playwright", storyId))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""));
    }

    @Test
    void exportsTestSuiteApprovedTestCasesAsPlaywrightDownload() throws Exception {
        UUID testSuiteId = UUID.randomUUID();
        String filename = "test-suite-" + testSuiteId + "-approved-test-cases.spec.ts";
        String body = "import { test, expect } from '@playwright/test';\n\ntest.describe('Checkout regression', () => {});\n";

        when(exportService.exportTestSuite(testSuiteId, ExportFormat.PLAYWRIGHT))
                .thenReturn(new ExportResult(filename, "text/plain", body));

        mockMvc.perform(get("/api/test-suites/{testSuiteId}/exports/playwright", testSuiteId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/plain"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""))
                .andExpect(content().string(body));
    }

    @Test
    void playwrightTestSuiteExportResponseHasSpecTsFilename() throws Exception {
        UUID testSuiteId = UUID.randomUUID();
        String filename = "test-suite-" + testSuiteId + "-approved-test-cases.spec.ts";

        when(exportService.exportTestSuite(testSuiteId, ExportFormat.PLAYWRIGHT))
                .thenReturn(new ExportResult(filename, "text/plain", ""));

        mockMvc.perform(get("/api/test-suites/{testSuiteId}/exports/playwright", testSuiteId))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""));
    }

    @Test
    void returnsNotFoundWhenStoryDoesNotExistForPlaywrightExport() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(exportService.exportStory(storyId, ExportFormat.PLAYWRIGHT))
                .thenThrow(new ResourceNotFoundException("Story not found: " + storyId));

        mockMvc.perform(get("/api/stories/{storyId}/exports/playwright", storyId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Story not found: " + storyId));
    }

    @Test
    void returnsNotFoundWhenTestSuiteDoesNotExistForPlaywrightExport() throws Exception {
        UUID testSuiteId = UUID.randomUUID();
        when(exportService.exportTestSuite(testSuiteId, ExportFormat.PLAYWRIGHT))
                .thenThrow(new ResourceNotFoundException("Test suite not found: " + testSuiteId));

        mockMvc.perform(get("/api/test-suites/{testSuiteId}/exports/playwright", testSuiteId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Test suite not found: " + testSuiteId));
    }
}
