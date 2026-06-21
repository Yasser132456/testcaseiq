package com.testcaseiq.api.testsuite;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.security.JwtAuthenticationFilter;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.security.SecurityConfig;
import com.testcaseiq.api.testsuite.controller.TestSuiteController;
import com.testcaseiq.api.testsuite.dto.TestSuiteDetailResponse;
import com.testcaseiq.api.testsuite.dto.TestSuiteResponse;
import com.testcaseiq.api.testsuite.service.TestSuiteService;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@WebMvcTest(TestSuiteController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.enforce-auth=true",
        "app.security.jwt-secret=testsuite-test-secret-for-suite-access"
})
class TestSuiteControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private TestSuiteService testSuiteService;

    @MockBean
    private AuditService auditService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    private static final UUID SUITE_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID STORY_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID PROJECT_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");

    private TestSuiteResponse suiteResponse() {
        return new TestSuiteResponse(SUITE_ID, STORY_ID, "My Story", PROJECT_ID, "My Project",
                "Suite Alpha", "Generated suite", "API", 5, 3, 1, Instant.now(), Instant.now());
    }

    private TestSuiteDetailResponse detailResponse() {
        return new TestSuiteDetailResponse(SUITE_ID, STORY_ID, "My Story", PROJECT_ID, "My Project",
                "Suite Alpha", "Generated suite", "API", 5, 3, 1, List.of(), Instant.now(), Instant.now(), null);
    }

    @Test
    void viewerCanListSuites() throws Exception {
        given(testSuiteService.listSuites(isNull(), isNull(), eq(false), eq(0), eq(20)))
                .willReturn(new PageImpl<>(List.of(suiteResponse())));
        String token = tokenFor("viewer@test.com", UserRole.VIEWER);

        mockMvc.perform(get("/api/test-suites").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Suite Alpha"))
                .andExpect(jsonPath("$.content[0].totalCases").value(5))
                .andExpect(jsonPath("$.content[0].approvedCases").value(3));
    }

    @Test
    void viewerCanGetSuiteDetail() throws Exception {
        given(testSuiteService.getSuiteDetail(SUITE_ID)).willReturn(detailResponse());
        String token = tokenFor("viewer@test.com", UserRole.VIEWER);

        mockMvc.perform(get("/api/test-suites/" + SUITE_ID).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Suite Alpha"))
                .andExpect(jsonPath("$.storyTitle").value("My Story"))
                .andExpect(jsonPath("$.projectName").value("My Project"));
    }

    @Test
    void qaEngineerCanUpdateSuite() throws Exception {
        given(testSuiteService.updateSuite(eq(SUITE_ID), any())).willReturn(suiteResponse());
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(patch("/api/test-suites/" + SUITE_ID)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\":\"Updated description\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Suite Alpha"));
    }

    @Test
    void viewerCannotUpdateSuite() throws Exception {
        String token = tokenFor("viewer@test.com", UserRole.VIEWER);

        mockMvc.perform(patch("/api/test-suites/" + SUITE_ID)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\":\"Updated\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanDeleteSuite() throws Exception {
        given(testSuiteService.deleteSuite(SUITE_ID)).willReturn(STORY_ID);
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(delete("/api/test-suites/" + SUITE_ID).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void qaEngineerCannotDeleteSuite() throws Exception {
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(delete("/api/test-suites/" + SUITE_ID).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void canFilterByProjectId() throws Exception {
        given(testSuiteService.listSuites(isNull(), eq(PROJECT_ID), eq(false), eq(0), eq(20)))
                .willReturn(new PageImpl<>(List.of(suiteResponse())));
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(get("/api/test-suites").param("projectId", PROJECT_ID.toString())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void canFilterApprovedOnly() throws Exception {
        given(testSuiteService.listSuites(isNull(), isNull(), eq(true), eq(0), eq(20)))
                .willReturn(new PageImpl<>(List.of(suiteResponse())));
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(get("/api/test-suites").param("approvedOnly", "true")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/test-suites"))
                .andExpect(status().isUnauthorized());
    }

    private String tokenFor(String email, UserRole role) {
        UserAccount user = new UserAccount("Test User", email, "hashed-password", role);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        org.mockito.Mockito.when(userAccountRepository.findByEmailIgnoreCase(email))
                .thenReturn(Optional.of(user));
        return jwtService.generateToken(user);
    }
}
