package com.testcaseiq.api.admin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
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

import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.security.JwtAuthenticationFilter;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.security.SecurityConfig;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@WebMvcTest(AdminUserController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.enforce-auth=true",
        "app.security.jwt-secret=admin-test-secret-for-user-administration"
})
class AdminUserControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private AdminUserService adminUserService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    @MockBean
    private AuditService auditService;

    @Test
    void adminCanListUsers() throws Exception {
        UUID userId = UUID.randomUUID();
        given(adminUserService.listUsers()).willReturn(List.of(
                new AdminUserResponse(userId, "Ada Lovelace", "ada@example.com",
                        UserRole.QA_ENGINEER, true, Instant.now(), Instant.now())
        ));
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("ada@example.com"))
                .andExpect(jsonPath("$[0].role").value("QA_ENGINEER"))
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    @Test
    void qaEngineerCannotListUsers() throws Exception {
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void viewerCannotListUsers() throws Exception {
        String token = tokenFor("viewer@test.com", UserRole.VIEWER);

        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void unauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void adminCanUpdateUserRole() throws Exception {
        UUID userId = UUID.randomUUID();
        given(adminUserService.updateRole(eq(userId), any(), eq(UserRole.VIEWER))).willReturn(
                new AdminUserResponse(userId, "Ada Lovelace", "ada@example.com",
                        UserRole.VIEWER, true, Instant.now(), Instant.now())
        );
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(patch("/api/admin/users/{userId}/role", userId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role": "VIEWER"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("VIEWER"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void qaEngineerCannotUpdateUserRole() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = tokenFor("qa@test.com", UserRole.QA_ENGINEER);

        mockMvc.perform(patch("/api/admin/users/{userId}/role", userId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role": "VIEWER"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidRoleIsRejected() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(patch("/api/admin/users/{userId}/role", userId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role": "SUPER_ADMIN"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminCanEnableDisableUser() throws Exception {
        UUID userId = UUID.randomUUID();
        given(adminUserService.updateStatus(eq(userId), any(), eq(false))).willReturn(
                new AdminUserResponse(userId, "Ada Lovelace", "ada@example.com",
                        UserRole.QA_ENGINEER, false, Instant.now(), Instant.now())
        );
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(patch("/api/admin/users/{userId}/status", userId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"enabled": false}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void lastAdminDemotionIsRejected() throws Exception {
        UUID userId = UUID.randomUUID();
        given(adminUserService.updateRole(eq(userId), any(), eq(UserRole.VIEWER)))
                .willThrow(new BadRequestException("Cannot demote the last remaining administrator"));
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(patch("/api/admin/users/{userId}/role", userId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"role": "VIEWER"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cannot demote the last remaining administrator"));
    }

    @Test
    void selfDisableIsRejected() throws Exception {
        UUID userId = UUID.randomUUID();
        given(adminUserService.updateStatus(eq(userId), any(), eq(false)))
                .willThrow(new BadRequestException("You cannot disable your own account"));
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(patch("/api/admin/users/{userId}/status", userId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"enabled": false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You cannot disable your own account"));
    }

    @Test
    void passwordHashIsNeverReturnedInUserList() throws Exception {
        UUID userId = UUID.randomUUID();
        given(adminUserService.listUsers()).willReturn(List.of(
                new AdminUserResponse(userId, "Ada Lovelace", "ada@example.com",
                        UserRole.QA_ENGINEER, true, Instant.now(), Instant.now())
        ));
        String token = tokenFor("admin@test.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    private String tokenFor(String email, UserRole role) {
        UserAccount user = new UserAccount("Test User", email, "hashed-password", role);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        org.mockito.Mockito.when(userAccountRepository.findByEmailIgnoreCase(email))
                .thenReturn(Optional.of(user));
        return jwtService.generateToken(user);
    }
}
