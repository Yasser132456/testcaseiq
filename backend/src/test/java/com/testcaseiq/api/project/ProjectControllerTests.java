package com.testcaseiq.api.project;

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

@WebMvcTest(ProjectController.class)
class ProjectControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @Test
    void createsProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        given(projectService.create(any(ProjectCreateRequest.class)))
                .willReturn(projectResponse(projectId, "Claims", "claims"));

        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Claims",
                                  "description": "Claims QA workspace"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/projects/" + projectId))
                .andExpect(jsonPath("$.id").value(projectId.toString()))
                .andExpect(jsonPath("$.name").value("Claims"))
                .andExpect(jsonPath("$.key").value("claims"));
    }

    @Test
    void rejectsProjectWithoutName() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "description": "Missing name"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request validation failed"))
                .andExpect(jsonPath("$.fieldErrors.name").value("Project name is required"));
    }

    @Test
    void listsProjects() throws Exception {
        UUID projectId = UUID.randomUUID();
        given(projectService.list()).willReturn(List.of(projectResponse(projectId, "Claims", "claims")));

        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(projectId.toString()))
                .andExpect(jsonPath("$[0].name").value("Claims"));
    }

    @Test
    void getsProjectById() throws Exception {
        UUID projectId = UUID.randomUUID();
        given(projectService.get(projectId)).willReturn(projectResponse(projectId, "Claims", "claims"));

        mockMvc.perform(get("/api/projects/{projectId}", projectId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(projectId.toString()));
    }

    @Test
    void returnsNotFoundForMissingProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        given(projectService.get(projectId)).willThrow(new ResourceNotFoundException("Project not found: " + projectId));

        mockMvc.perform(get("/api/projects/{projectId}", projectId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Project not found: " + projectId));
    }

    @Test
    void updatesProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        given(projectService.update(eq(projectId), any(ProjectUpdateRequest.class)))
                .willReturn(projectResponse(projectId, "Claims v2", "claims"));

        mockMvc.perform(patch("/api/projects/{projectId}", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Claims v2"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Claims v2"));
    }

    @Test
    void deletesProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        willDoNothing().given(projectService).delete(projectId);

        mockMvc.perform(delete("/api/projects/{projectId}", projectId))
                .andExpect(status().isNoContent());
    }

    @Test
    void returnsNotFoundWhenDeletingMissingProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        willThrow(new ResourceNotFoundException("Project not found: " + projectId))
                .given(projectService).delete(projectId);

        mockMvc.perform(delete("/api/projects/{projectId}", projectId))
                .andExpect(status().isNotFound());
    }

    private ProjectResponse projectResponse(UUID id, String name, String key) {
        return new ProjectResponse(
                id,
                name,
                key,
                "Description",
                Instant.parse("2026-06-14T12:00:00Z"),
                Instant.parse("2026-06-14T12:00:00Z")
        );
    }
}
