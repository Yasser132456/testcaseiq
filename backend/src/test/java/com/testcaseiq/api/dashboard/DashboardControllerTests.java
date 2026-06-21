package com.testcaseiq.api.dashboard;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.dashboard.controller.DashboardController;
import com.testcaseiq.api.dashboard.dto.DashboardMetricsResponse;
import com.testcaseiq.api.dashboard.service.DashboardService;
import com.testcaseiq.api.security.JwtAuthenticationFilter;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.security.SecurityConfig;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@WebMvcTest(DashboardController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.enforce-auth=true",
        "app.security.jwt-secret=dashboard-test-secret-for-metrics-access"
})
class DashboardControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private DashboardService dashboardService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    private static final DashboardMetricsResponse METRICS = new DashboardMetricsResponse(
            3, 12, 9, 3, 18, 72, 45, 8, 14, 5, 6,
            62.5, 11.1, 19.4, 62.5,
            List.of(new DashboardMetricsResponse.RecentActivityItem(
                    "2026-06-21T00:00:00Z", "TEST_GENERATION_REQUESTED",
                    "qa@example.com", "QA_ENGINEER", "STORY", "SUCCESS", "Tests generated"
            ))
    );

    private static final DashboardMetricsResponse ZERO_METRICS = new DashboardMetricsResponse(
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0.0, 0.0, 0.0, 0.0, List.of()
    );

    @Test
    void adminCanGetMetrics() throws Exception {
        given(dashboardService.getMetrics()).willReturn(METRICS);
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/dashboard/metrics").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProjects").value(3))
                .andExpect(jsonPath("$.totalTestCases").value(72))
                .andExpect(jsonPath("$.approvedTestCases").value(45))
                .andExpect(jsonPath("$.approvalRate").value(62.5))
                .andExpect(jsonPath("$.recentActivity[0].action").value("TEST_GENERATION_REQUESTED"));
    }

    @Test
    void qaEngineerCanGetMetrics() throws Exception {
        given(dashboardService.getMetrics()).willReturn(METRICS);
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(get("/api/dashboard/metrics").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProjects").value(3));
    }

    @Test
    void viewerCanGetMetrics() throws Exception {
        given(dashboardService.getMetrics()).willReturn(METRICS);
        String token = tokenFor("viewer@test.com", UserRole.VIEWER);

        mockMvc.perform(get("/api/dashboard/metrics").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTestCases").value(72));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/dashboard/metrics"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void zeroDataStateReturnsValidResponse() throws Exception {
        given(dashboardService.getMetrics()).willReturn(ZERO_METRICS);
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/dashboard/metrics").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProjects").value(0))
                .andExpect(jsonPath("$.approvalRate").value(0.0))
                .andExpect(jsonPath("$.recentActivity").isArray());
    }

    @Test
    void noSensitiveFieldsInResponse() throws Exception {
        given(dashboardService.getMetrics()).willReturn(METRICS);
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/dashboard/metrics").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentActivity[0].actorEmail").value("qa@example.com"))
                .andExpect(jsonPath("$.recentActivity[0].password").doesNotExist())
                .andExpect(jsonPath("$.recentActivity[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.recentActivity[0].token").doesNotExist())
                .andExpect(jsonPath("$.recentActivity[0].apiKey").doesNotExist());
    }

    @Test
    void exportReadinessRateMatchesApprovalRate() throws Exception {
        given(dashboardService.getMetrics()).willReturn(METRICS);
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/dashboard/metrics").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exportReadinessRate").value(62.5));
    }

    private String tokenFor(String email, UserRole role) {
        UserAccount user = new UserAccount("Test User", email, "hashed-password", role);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        org.mockito.Mockito.when(userAccountRepository.findByEmailIgnoreCase(email))
                .thenReturn(Optional.of(user));
        return jwtService.generateToken(user);
    }
}
