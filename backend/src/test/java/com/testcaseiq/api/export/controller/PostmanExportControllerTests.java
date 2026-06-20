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
class PostmanExportControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExportService exportService;

    @Test
    void exportsStoryApprovedTestCasesAsPostmanDownload() throws Exception {
        UUID storyId = UUID.randomUUID();
        String filename = "story-" + storyId + "-approved-api-tests.postman_collection.json";
        String body = "{\"info\":{\"name\":\"TestCaseIQ\"},\"item\":[]}";

        when(exportService.exportStory(storyId, ExportFormat.POSTMAN))
                .thenReturn(new ExportResult(filename, "application/json", body));

        mockMvc.perform(get("/api/stories/{storyId}/exports/postman", storyId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""))
                .andExpect(content().string(body));
    }

    @Test
    void postmanStoryExportResponseHasCorrectFilename() throws Exception {
        UUID storyId = UUID.randomUUID();
        String filename = "story-" + storyId + "-approved-api-tests.postman_collection.json";

        when(exportService.exportStory(storyId, ExportFormat.POSTMAN))
                .thenReturn(new ExportResult(filename, "application/json", "{}"));

        mockMvc.perform(get("/api/stories/{storyId}/exports/postman", storyId))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""));
    }

    @Test
    void exportsTestSuiteApprovedTestCasesAsPostmanDownload() throws Exception {
        UUID testSuiteId = UUID.randomUUID();
        String filename = "test-suite-" + testSuiteId + "-approved-api-tests.postman_collection.json";
        String body = "{\"info\":{\"name\":\"TestCaseIQ API suite\"},\"item\":[]}";

        when(exportService.exportTestSuite(testSuiteId, ExportFormat.POSTMAN))
                .thenReturn(new ExportResult(filename, "application/json", body));

        mockMvc.perform(get("/api/test-suites/{testSuiteId}/exports/postman", testSuiteId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""))
                .andExpect(content().string(body));
    }

    @Test
    void postmanTestSuiteExportResponseHasCorrectFilename() throws Exception {
        UUID testSuiteId = UUID.randomUUID();
        String filename = "test-suite-" + testSuiteId + "-approved-api-tests.postman_collection.json";

        when(exportService.exportTestSuite(testSuiteId, ExportFormat.POSTMAN))
                .thenReturn(new ExportResult(filename, "application/json", "{}"));

        mockMvc.perform(get("/api/test-suites/{testSuiteId}/exports/postman", testSuiteId))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""));
    }

    @Test
    void returnsNotFoundWhenStoryDoesNotExistForPostmanExport() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(exportService.exportStory(storyId, ExportFormat.POSTMAN))
                .thenThrow(new ResourceNotFoundException("Story not found: " + storyId));

        mockMvc.perform(get("/api/stories/{storyId}/exports/postman", storyId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Story not found: " + storyId));
    }

    @Test
    void returnsNotFoundWhenTestSuiteDoesNotExistForPostmanExport() throws Exception {
        UUID testSuiteId = UUID.randomUUID();
        when(exportService.exportTestSuite(testSuiteId, ExportFormat.POSTMAN))
                .thenThrow(new ResourceNotFoundException("Test suite not found: " + testSuiteId));

        mockMvc.perform(get("/api/test-suites/{testSuiteId}/exports/postman", testSuiteId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Test suite not found: " + testSuiteId));
    }
}
