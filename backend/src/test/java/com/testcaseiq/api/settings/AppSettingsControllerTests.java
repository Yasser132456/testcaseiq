package com.testcaseiq.api.settings;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.security.JwtAuthenticationFilter;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.security.SecurityConfig;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@WebMvcTest(AppSettingsController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.enforce-auth=true",
        "app.security.jwt-secret=settings-test-secret-for-settings-access"
})
class AppSettingsControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private AppSettingsService settingsService;

    @MockBean
    private AuditService auditService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    private static final AppSettingsDto DEFAULT_SETTINGS = new AppSettingsDto(
            "MOCK", "BALANCED", 10, true, true, false, false, false
    );

    @BeforeEach
    void setUp() {
        given(settingsService.getSettings()).willReturn(DEFAULT_SETTINGS);
    }

    @Test
    void adminCanGetSettings() throws Exception {
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/settings").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeProvider").value("MOCK"))
                .andExpect(jsonPath("$.generationMode").value("BALANCED"))
                .andExpect(jsonPath("$.maxTestCasesPerStory").value(10))
                .andExpect(jsonPath("$.enableExplainability").value(true))
                .andExpect(jsonPath("$.enableQualityScoring").value(true))
                .andExpect(jsonPath("$.requireReviewBeforeExport").value(false))
                .andExpect(jsonPath("$.enforceAcceptanceCriteriaMapping").value(false));
    }

    @Test
    void qaEngineerCanGetSettings() throws Exception {
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(get("/api/settings").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeProvider").value("MOCK"));
    }

    @Test
    void viewerIsBlockedFromGetSettings() throws Exception {
        String token = tokenFor("viewer@test.com", UserRole.VIEWER);

        mockMvc.perform(get("/api/settings").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanPatchSettings() throws Exception {
        AppSettingsDto updated = new AppSettingsDto("OPENAI", "STRICT", 5, false, true, true, true, false);
        given(settingsService.updateSettings(any())).willReturn(updated);

        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(patch("/api/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "activeProvider": "OPENAI",
                                  "generationMode": "STRICT",
                                  "maxTestCasesPerStory": 5,
                                  "enableExplainability": false,
                                  "requireReviewBeforeExport": true,
                                  "enforceAcceptanceCriteriaMapping": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeProvider").value("OPENAI"))
                .andExpect(jsonPath("$.generationMode").value("STRICT"))
                .andExpect(jsonPath("$.maxTestCasesPerStory").value(5));

        verify(settingsService).updateSettings(any());
    }

    @Test
    void qaEngineerCannotPatchSettings() throws Exception {
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(patch("/api/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"generationMode\": \"CREATIVE\"}"))
                .andExpect(status().isForbidden());

        verify(settingsService, never()).updateSettings(any());
    }

    @Test
    void viewerCannotPatchSettings() throws Exception {
        String token = tokenFor("viewer@test.com", UserRole.VIEWER);

        mockMvc.perform(patch("/api/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"generationMode\": \"CREATIVE\"}"))
                .andExpect(status().isForbidden());

        verify(settingsService, never()).updateSettings(any());
    }

    @Test
    void invalidProviderValueReturns400() throws Exception {
        given(settingsService.updateSettings(any()))
                .willThrow(new BadRequestException("Invalid activeProvider: INVALID"));

        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(patch("/api/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activeProvider\": \"INVALID\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidMaxTestCasesReturns400() throws Exception {
        given(settingsService.updateSettings(any()))
                .willThrow(new BadRequestException("maxTestCasesPerStory must be between 1 and 50"));

        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(patch("/api/settings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"maxTestCasesPerStory\": 999}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("maxTestCasesPerStory must be between 1 and 50"));
    }

    @Test
    void responseDoesNotExposeSecrets() throws Exception {
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        String responseBody = mockMvc.perform(get("/api/settings")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        org.assertj.core.api.Assertions.assertThat(responseBody).doesNotContain("apiKey");
        org.assertj.core.api.Assertions.assertThat(responseBody).doesNotContain("password");
        org.assertj.core.api.Assertions.assertThat(responseBody).doesNotContain("secret");
        org.assertj.core.api.Assertions.assertThat(responseBody).doesNotContain("token");
    }

    private String tokenFor(String email, UserRole role) {
        UserAccount user = new UserAccount("Test User", email, "hashed-password", role);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        org.mockito.Mockito.when(userAccountRepository.findByEmailIgnoreCase(email))
                .thenReturn(Optional.of(user));
        return jwtService.generateToken(user);
    }
}
