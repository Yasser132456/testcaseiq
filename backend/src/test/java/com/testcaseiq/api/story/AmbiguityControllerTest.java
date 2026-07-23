package com.testcaseiq.api.story;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.audit.AuditAction;
import com.testcaseiq.api.audit.AuditOutcome;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.domain.enums.AmbiguityResolutionStatus;
import com.testcaseiq.api.domain.enums.AmbiguitySeverity;
import com.testcaseiq.api.security.JwtAuthenticationFilter;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.security.SecurityConfig;
import com.testcaseiq.api.story.dto.AmbiguityResolutionRequest;
import com.testcaseiq.api.story.dto.AmbiguityResponse;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@WebMvcTest(AmbiguityController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.enforce-auth=true",
        "app.security.jwt-secret=ambiguity-controller-test-secret"
})
class AmbiguityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private AmbiguityService ambiguityService;

    @MockBean
    private AuditService auditService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    @Test
    void getReturnsAmbiguitiesForStory() throws Exception {
        UUID storyId = UUID.randomUUID();
        UUID ambiguityId = UUID.randomUUID();
        given(ambiguityService.listForStory(storyId)).willReturn(List.of(response(ambiguityId)));

        mockMvc.perform(get("/api/stories/{storyId}/ambiguities", storyId)
                        .header("Authorization", "Bearer " + tokenFor("viewer@test.com", UserRole.VIEWER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(ambiguityId.toString()))
                .andExpect(jsonPath("$[0].status").value("OPEN"));
    }

    @Test
    void patchResolvesAmbiguityAndAuditsResolution() throws Exception {
        UUID storyId = UUID.randomUUID();
        UUID ambiguityId = UUID.randomUUID();
        given(ambiguityService.resolve(eq(storyId), eq(ambiguityId), any(AmbiguityResolutionRequest.class), eq("qa@test.com")))
                .willReturn(new AmbiguityResponse(
                        ambiguityId,
                        "Which fields are required?",
                        "The story omits validation details.",
                        AmbiguitySeverity.CRITICAL,
                        AmbiguityResolutionStatus.ANSWERED,
                        "Use checkout fields.",
                        "qa@test.com",
                        Instant.parse("2026-06-14T12:00:00Z")
                ));

        mockMvc.perform(patch("/api/stories/{storyId}/ambiguities/{ambiguityId}", storyId, ambiguityId)
                        .header("Authorization", "Bearer " + tokenFor("qa@test.com", UserRole.QA_ENGINEER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resolutionNotes": "Use checkout fields.",
                                  "status": "ANSWERED"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ANSWERED"))
                .andExpect(jsonPath("$.resolvedBy").value("qa@test.com"));

        verify(auditService).log(eq(AuditAction.AMBIGUITY_RESOLVED), eq("AMBIGUITY"),
                eq(ambiguityId.toString()), eq(AuditOutcome.SUCCESS), eq(null), any());
    }

    @Test
    void patchAsViewerIsForbidden() throws Exception {
        UUID storyId = UUID.randomUUID();
        UUID ambiguityId = UUID.randomUUID();

        mockMvc.perform(patch("/api/stories/{storyId}/ambiguities/{ambiguityId}", storyId, ambiguityId)
                        .header("Authorization", "Bearer " + tokenFor("viewer2@test.com", UserRole.VIEWER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "resolutionNotes": "Not needed.",
                                  "status": "DISMISSED"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    private String tokenFor(String email, UserRole role) {
        UserAccount user = new UserAccount("Test User", email, "hashed-password", role);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        when(userAccountRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(user));
        return jwtService.generateToken(user);
    }

    private AmbiguityResponse response(UUID id) {
        return new AmbiguityResponse(
                id,
                "Which fields are required?",
                "The story omits validation details.",
                AmbiguitySeverity.CRITICAL,
                AmbiguityResolutionStatus.OPEN,
                null,
                null,
                null
        );
    }
}
