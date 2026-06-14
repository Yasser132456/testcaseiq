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
class ExportControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExportService exportService;

    @Test
    void exportsStoryApprovedTestCasesAsMarkdownDownload() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(exportService.exportStory(storyId, ExportFormat.MARKDOWN))
                .thenReturn(new ExportResult(
                        "story-" + storyId + "-approved-test-cases.md",
                        "text/markdown",
                        "# Approved Test Cases"
                ));

        mockMvc.perform(get("/api/stories/{storyId}/exports/markdown", storyId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/markdown"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"story-" + storyId + "-approved-test-cases.md\""))
                .andExpect(content().string("# Approved Test Cases"));
    }

    @Test
    void exportsStoryApprovedTestCasesAsCsvDownload() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(exportService.exportStory(storyId, ExportFormat.CSV))
                .thenReturn(new ExportResult(
                        "story-" + storyId + "-approved-test-cases.csv",
                        "text/csv",
                        "storyTitle,testSuiteName,testCaseId,title\nCheckout,Regression,TC-1,Happy path\n"
                ));

        mockMvc.perform(get("/api/stories/{storyId}/exports/csv", storyId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"story-" + storyId + "-approved-test-cases.csv\""))
                .andExpect(content().string("storyTitle,testSuiteName,testCaseId,title\nCheckout,Regression,TC-1,Happy path\n"));
    }

    @Test
    void exportsStoryApprovedTestCasesAsJsonDownload() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(exportService.exportStory(storyId, ExportFormat.JSON))
                .thenReturn(new ExportResult(
                        "story-" + storyId + "-approved-test-cases.json",
                        "application/json",
                        "{\"storyId\":\"" + storyId + "\",\"testCases\":[]}"
                ));

        mockMvc.perform(get("/api/stories/{storyId}/exports/json", storyId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"story-" + storyId + "-approved-test-cases.json\""))
                .andExpect(content().json("{\"storyId\":\"" + storyId + "\",\"testCases\":[]}"));
    }

    @Test
    void returnsNotFoundWhenStoryDoesNotExist() throws Exception {
        UUID storyId = UUID.randomUUID();
        when(exportService.exportStory(storyId, ExportFormat.MARKDOWN))
                .thenThrow(new ResourceNotFoundException("Story not found: " + storyId));

        mockMvc.perform(get("/api/stories/{storyId}/exports/markdown", storyId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Story not found: " + storyId));
    }
}
