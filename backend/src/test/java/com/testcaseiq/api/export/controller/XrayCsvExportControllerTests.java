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
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.export.dto.ExportFormat;
import com.testcaseiq.api.export.dto.ExportResult;
import com.testcaseiq.api.export.service.ExportService;

@WebMvcTest(ExportController.class)
@AutoConfigureMockMvc(addFilters = false)
class XrayCsvExportControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExportService exportService;

    @Test
    void exportsStoryApprovedTestCasesAsXrayCsvDownload() throws Exception {
        UUID storyId = UUID.randomUUID();
        String filename = "story-" + storyId + "-approved-tests-xray.csv";
        String body = "Test Case ID,Summary,Export Warning\nTC-1,Checkout,Review required before Jira/Xray import\n";

        when(exportService.exportStory(storyId, ExportFormat.XRAY_CSV))
                .thenReturn(new ExportResult(filename, "text/csv", body));

        mockMvc.perform(get("/api/stories/{storyId}/exports/xray-csv", storyId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""))
                .andExpect(content().string(body));
    }

    @Test
    void exportsTestSuiteApprovedTestCasesAsXrayCsvDownload() throws Exception {
        UUID testSuiteId = UUID.randomUUID();
        String filename = "test-suite-" + testSuiteId + "-approved-tests-xray.csv";
        String body = "Test Case ID,Summary,Export Warning\nTC-1,Checkout,Review required before Jira/Xray import\n";

        when(exportService.exportTestSuite(testSuiteId, ExportFormat.XRAY_CSV))
                .thenReturn(new ExportResult(filename, "text/csv", body));

        mockMvc.perform(get("/api/test-suites/{testSuiteId}/exports/xray-csv", testSuiteId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""))
                .andExpect(content().string(body));
    }

    @Test
    void returnsNotFoundWhenStoryDoesNotExistForXrayCsvExport() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(exportService.exportStory(storyId, ExportFormat.XRAY_CSV))
                .thenThrow(new ResourceNotFoundException("Story not found: " + storyId));

        mockMvc.perform(get("/api/stories/{storyId}/exports/xray-csv", storyId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Story not found: " + storyId));
    }
}
