package com.testcaseiq.api.audit;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.security.JwtAuthenticationFilter;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.security.SecurityConfig;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@WebMvcTest(AuditController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.enforce-auth=true",
        "app.security.jwt-secret=audit-test-secret-for-audit-log-access"
})
class AuditControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private AuditEventRepository auditEventRepository;

    @MockBean
    private UserAccountRepository userAccountRepository;

    @Test
    void adminCanListAuditEvents() throws Exception {
        AuditEvent event = new AuditEvent("USER_LOGIN_SUCCESS", "USER",
                UUID.randomUUID().toString(), "SUCCESS", "Login successful");
        ReflectionTestUtils.setField(event, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(event, "actorEmail", "admin@example.com");
        given(auditEventRepository.findWithFilters(isNull(), isNull(), isNull(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(event)));
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/audit/events").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].action").value("USER_LOGIN_SUCCESS"))
                .andExpect(jsonPath("$.content[0].outcome").value("SUCCESS"))
                .andExpect(jsonPath("$.content[0].actorEmail").value("admin@example.com"));
    }

    @Test
    void qaEngineerCannotListAuditEvents() throws Exception {
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(get("/api/audit/events").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void viewerCannotListAuditEvents() throws Exception {
        String token = tokenFor("viewer@test.com", UserRole.VIEWER);

        mockMvc.perform(get("/api/audit/events").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/audit/events"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void noSecretsReturnedInAuditResponse() throws Exception {
        AuditEvent event = new AuditEvent("USER_REGISTERED", "USER",
                UUID.randomUUID().toString(), "SUCCESS", null);
        ReflectionTestUtils.setField(event, "id", UUID.randomUUID());
        given(auditEventRepository.findWithFilters(isNull(), isNull(), isNull(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(event)));
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/audit/events").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.content[0].token").doesNotExist())
                .andExpect(jsonPath("$.content[0].apiKey").doesNotExist())
                .andExpect(jsonPath("$.content[0].secret").doesNotExist());
    }

    private String tokenFor(String email, UserRole role) {
        UserAccount user = new UserAccount("Test User", email, "hashed-password", role);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        org.mockito.Mockito.when(userAccountRepository.findByEmailIgnoreCase(email))
                .thenReturn(Optional.of(user));
        return jwtService.generateToken(user);
    }
}
