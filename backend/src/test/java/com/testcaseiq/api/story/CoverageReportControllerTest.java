package com.testcaseiq.api.story;

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

import com.testcaseiq.api.domain.enums.RiskLevel;
import com.testcaseiq.api.security.JwtAuthenticationFilter;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.security.SecurityConfig;
import com.testcaseiq.api.story.dto.CoverageGap;
import com.testcaseiq.api.story.dto.CoverageReportResponse;
import com.testcaseiq.api.story.dto.RequirementCoverage;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@WebMvcTest(CoverageReportController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.enforce-auth=true",
        "app.security.jwt-secret=coverage-report-controller-test-secret"
})
class CoverageReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private CoverageReportService coverageReportService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    @Test
    void viewerCanGetCoverageReportShape() throws Exception {
        UUID storyId = UUID.randomUUID();
        given(coverageReportService.getReport(storyId)).willReturn(new CoverageReportResponse(
                storyId,
                List.of(new RequirementCoverage("REQ-1", "Payment succeeds", RiskLevel.HIGH, List.of(), false)),
                List.of(new CoverageGap("REQ-1", "Payment succeeds description", RiskLevel.HIGH, "REQUIREMENT")),
                0,
                1
        ));

        mockMvc.perform(get("/api/stories/{storyId}/coverage", storyId)
                        .header("Authorization", "Bearer " + tokenFor("viewer@test.com", UserRole.VIEWER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storyId").value(storyId.toString()))
                .andExpect(jsonPath("$.requirements[0].reference").value("REQ-1"))
                .andExpect(jsonPath("$.requirements[0].covered").value(false))
                .andExpect(jsonPath("$.requirements[0].linkedCases").isArray())
                .andExpect(jsonPath("$.gaps[0].kind").value("REQUIREMENT"))
                .andExpect(jsonPath("$.coveredCount").value(0))
                .andExpect(jsonPath("$.totalRequirements").value(1));
    }

    private String tokenFor(String email, UserRole role) {
        UserAccount user = new UserAccount("Test User", email, "hashed-password", role);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        org.mockito.Mockito.when(userAccountRepository.findByEmailIgnoreCase(email))
                .thenReturn(Optional.of(user));
        return jwtService.generateToken(user);
    }
}
