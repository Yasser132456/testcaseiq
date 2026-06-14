package com.testcaseiq.api.story;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.domain.enums.StoryStatus;
import com.testcaseiq.api.domain.enums.StoryType;

@WebMvcTest(StoryController.class)
class StoryControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StoryService storyService;

    @Test
    void createsStoryUnderProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        UUID storyId = UUID.randomUUID();
        given(storyService.create(eq(projectId), any(StoryCreateRequest.class)))
                .willReturn(storyResponse(storyId, projectId, "Checkout payment"));

        mockMvc.perform(post("/api/projects/{projectId}/stories", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Checkout payment",
                                  "rawText": "As a buyer, I can pay by card.",
                                  "type": "USER_STORY"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/stories/" + storyId))
                .andExpect(jsonPath("$.id").value(storyId.toString()))
                .andExpect(jsonPath("$.projectId").value(projectId.toString()))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    void rejectsStoryWithoutRequiredFields() throws Exception {
        UUID projectId = UUID.randomUUID();

        mockMvc.perform(post("/api/projects/{projectId}/stories", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "USER_STORY"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").value("Story title is required"))
                .andExpect(jsonPath("$.fieldErrors.rawText").value("Story raw text is required"));
    }

    @Test
    void rejectsInvalidStoryType() throws Exception {
        UUID projectId = UUID.randomUUID();

        mockMvc.perform(post("/api/projects/{projectId}/stories", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Checkout payment",
                                  "rawText": "As a buyer, I can pay by card.",
                                  "type": "NOT_A_TYPE"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid request payload"));
    }

    @Test
    void listsStoriesForProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        UUID storyId = UUID.randomUUID();
        given(storyService.listForProject(projectId))
                .willReturn(List.of(storyResponse(storyId, projectId, "Checkout payment")));

        mockMvc.perform(get("/api/projects/{projectId}/stories", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(storyId.toString()))
                .andExpect(jsonPath("$[0].title").value("Checkout payment"));
    }

    @Test
    void getsStoryById() throws Exception {
        UUID projectId = UUID.randomUUID();
        UUID storyId = UUID.randomUUID();
        given(storyService.get(storyId)).willReturn(storyResponse(storyId, projectId, "Checkout payment"));

        mockMvc.perform(get("/api/stories/{storyId}", storyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(storyId.toString()));
    }

    @Test
    void returnsNotFoundForMissingStory() throws Exception {
        UUID storyId = UUID.randomUUID();
        given(storyService.get(storyId)).willThrow(new ResourceNotFoundException("Story not found: " + storyId));

        mockMvc.perform(get("/api/stories/{storyId}", storyId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Story not found: " + storyId));
    }

    @Test
    void updatesStory() throws Exception {
        UUID projectId = UUID.randomUUID();
        UUID storyId = UUID.randomUUID();
        given(storyService.update(eq(storyId), any(StoryUpdateRequest.class)))
                .willReturn(storyResponse(storyId, projectId, "Checkout payment updated"));

        mockMvc.perform(patch("/api/stories/{storyId}", storyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Checkout payment updated",
                                  "status": "ANALYZED"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Checkout payment updated"));
    }

    @Test
    void deletesStory() throws Exception {
        UUID storyId = UUID.randomUUID();
        willDoNothing().given(storyService).delete(storyId);

        mockMvc.perform(delete("/api/stories/{storyId}", storyId))
                .andExpect(status().isNoContent());
    }

    @Test
    void returnsNotFoundWhenDeletingMissingStory() throws Exception {
        UUID storyId = UUID.randomUUID();
        willThrow(new ResourceNotFoundException("Story not found: " + storyId))
                .given(storyService).delete(storyId);

        mockMvc.perform(delete("/api/stories/{storyId}", storyId))
                .andExpect(status().isNotFound());
    }

    private StoryResponse storyResponse(UUID id, UUID projectId, String title) {
        return new StoryResponse(
                id,
                projectId,
                title,
                "As a buyer, I can pay by card.",
                StoryType.USER_STORY,
                StoryStatus.DRAFT,
                null,
                null,
                Instant.parse("2026-06-14T12:00:00Z"),
                Instant.parse("2026-06-14T12:00:00Z")
        );
    }
}
