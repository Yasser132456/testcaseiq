package com.testcaseiq.api.security;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.project.ProjectController;
import com.testcaseiq.api.project.ProjectCreateRequest;
import com.testcaseiq.api.project.ProjectResponse;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.project.ProjectService;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@WebMvcTest(ProjectController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.enforce-auth=true",
        "app.security.jwt-secret=rbac-test-secret-for-role-access-control"
})
class RoleBasedAccessControlTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    @MockBean
    private AuditService auditService;

    @Test
    void adminCanListProjects() throws Exception {
        given(projectService.list()).willReturn(List.of());
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void qaEngineerCanListProjects() throws Exception {
        given(projectService.list()).willReturn(List.of());
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void viewerCanListProjects() throws Exception {
        given(projectService.list()).willReturn(List.of());
        String token = tokenFor("viewer@test.com", UserRole.VIEWER);

        mockMvc.perform(get("/api/projects").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void adminCanCreateProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        given(projectService.create(any(ProjectCreateRequest.class)))
                .willReturn(projectResponse(projectId));
        String token = tokenFor("admin2@test.com", UserRole.ADMIN);

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "Test Project"}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void qaEngineerCanCreateProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        given(projectService.create(any(ProjectCreateRequest.class)))
                .willReturn(projectResponse(projectId));
        String token = tokenFor("qa2@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "Test Project"}
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void viewerCannotCreateProject() throws Exception {
        String token = tokenFor("viewer2@test.com", UserRole.VIEWER);

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "Test Project"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void adminCanDeleteProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        willDoNothing().given(projectService).delete(projectId);
        String token = tokenFor("admin3@test.com", UserRole.ADMIN);

        mockMvc.perform(delete("/api/projects/{projectId}", projectId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void qaEngineerCannotDeleteProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        String token = tokenFor("qa3@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(delete("/api/projects/{projectId}", projectId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void viewerCannotDeleteProject() throws Exception {
        UUID projectId = UUID.randomUUID();
        String token = tokenFor("viewer3@test.com", UserRole.VIEWER);

        mockMvc.perform(delete("/api/projects/{projectId}", projectId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void unauthenticatedRequestIsRejectedWhenEnforcementEnabled() throws Exception {
        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    private String tokenFor(String email, UserRole role) {
        UserAccount user = new UserAccount("Test User", email, "hashed-password", role);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        when(userAccountRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(user));
        return jwtService.generateToken(user);
    }

    private ProjectResponse projectResponse(UUID id) {
        return new ProjectResponse(
                id,
                "Test Project",
                "test-project",
                null,
                Instant.parse("2026-06-20T00:00:00Z"),
                Instant.parse("2026-06-20T00:00:00Z")
        );
    }
}
