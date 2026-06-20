package com.testcaseiq.api.security;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.project.ProjectController;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.project.ProjectService;
import com.testcaseiq.api.user.UserAccountRepository;

@WebMvcTest(ProjectController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.enforce-auth=false",
        "app.security.jwt-secret=compatibility-test-secret"
})
class SecurityCompatibilityDisabledTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProjectService projectService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    @MockBean
    private AuditService auditService;

    @Test
    void demoModeKeepsBusinessEndpointsAccessibleWithoutJwt() throws Exception {
        when(projectService.list()).thenReturn(List.of());

        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isOk());
    }
}
