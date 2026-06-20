package com.testcaseiq.api.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.testcaseiq.api.auth.dto.AuthResponse;
import com.testcaseiq.api.auth.dto.LoginRequest;
import com.testcaseiq.api.auth.dto.RegisterRequest;
import com.testcaseiq.api.auth.dto.UserProfileResponse;
import com.testcaseiq.api.common.error.UnauthorizedException;
import com.testcaseiq.api.security.JwtAuthenticationFilter;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.security.SecurityConfig;
import com.testcaseiq.api.security.SecurityProperties;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.security.jwt-secret=controller-test-secret-used-only-for-tests",
        "app.security.enforce-auth=true"
})
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserAccountRepository userAccountRepository;

    @MockBean
    private AuditService auditService;

    @Test
    void registersUserWithoutReturningPasswordHash() throws Exception {
        UserProfileResponse user = new UserProfileResponse(
                UUID.randomUUID(),
                "Ada Lovelace",
                "ada@example.com",
                UserRole.QA_ENGINEER,
                true,
                Instant.parse("2026-06-20T00:00:00Z"),
                Instant.parse("2026-06-20T00:00:00Z")
        );
        when(authService.register(any(RegisterRequest.class))).thenReturn(new AuthResponse("jwt-token", user));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName": "Ada Lovelace",
                                  "email": "ada@example.com",
                                  "password": "valid-password"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.user.email").value("ada@example.com"))
                .andExpect(jsonPath("$.user.role").value("QA_ENGINEER"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
    }

    @Test
    void loginWithInvalidCredentialsReturnsUnauthorized() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenThrow(new UnauthorizedException("Invalid email or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "ada@example.com",
                                  "password": "wrong-password"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void meReturnsAuthenticatedUserForValidJwt() throws Exception {
        UserAccount user = new UserAccount(
                "Ada Lovelace",
                "ada@example.com",
                passwordEncoder.encode("valid-password"),
                UserRole.QA_ENGINEER
        );
        setId(user, UUID.randomUUID());
        when(userAccountRepository.findByEmailIgnoreCase("ada@example.com")).thenReturn(Optional.of(user));
        when(authService.profile(user)).thenReturn(UserProfileResponse.from(user));

        String token = jwtService.generateToken(user);

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ada@example.com"))
                .andExpect(jsonPath("$.role").value("QA_ENGINEER"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void meReturnsUnauthorizedWithoutJwt() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    private void setId(UserAccount user, UUID id) {
        ReflectionTestUtils.setField(user, "id", id);
    }
}
