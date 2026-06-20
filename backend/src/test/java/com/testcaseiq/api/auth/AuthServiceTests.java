package com.testcaseiq.api.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.testcaseiq.api.auth.dto.LoginRequest;
import com.testcaseiq.api.auth.dto.RegisterRequest;
import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.common.error.UnauthorizedException;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.security.SecurityProperties;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@ExtendWith(MockitoExtension.class)
class AuthServiceTests {

    @Mock
    private UserAccountRepository userAccountRepository;

    private AuthService authService;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new JwtService(new SecurityProperties(
                false,
                "dev-test-secret-used-only-for-auth-service-tests",
                3600
        ));
        authService = new AuthService(userAccountRepository, passwordEncoder, jwtService);
    }

    @Test
    void registrationHashesPasswordAndDefaultsRoleToQaEngineer() {
        RegisterRequest request = new RegisterRequest("Ada Lovelace", "ada@example.com", "valid-password");
        ArgumentCaptor<UserAccount> userCaptor = ArgumentCaptor.forClass(UserAccount.class);
        when(userAccountRepository.existsByEmailIgnoreCase("ada@example.com")).thenReturn(false);
        when(userAccountRepository.save(userCaptor.capture()))
                .thenAnswer(invocation -> {
                    UserAccount user = invocation.getArgument(0);
                    setId(user, UUID.randomUUID());
                    return user;
                });

        var response = authService.register(request);

        assertThat(response.user().email()).isEqualTo("ada@example.com");
        assertThat(response.user().role()).isEqualTo(UserRole.QA_ENGINEER);
        assertThat(response.user().enabled()).isTrue();
        UserAccount saved = userCaptor.getValue();
        assertThat(saved.getPasswordHash()).isNotEqualTo("valid-password");
        assertThat(passwordEncoder.matches("valid-password", saved.getPasswordHash())).isTrue();
        assertThat(response.user().toString()).doesNotContain("valid-password");
    }

    @Test
    void duplicateEmailIsRejected() {
        RegisterRequest request = new RegisterRequest("Ada Lovelace", "ada@example.com", "valid-password");
        when(userAccountRepository.existsByEmailIgnoreCase("ada@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Email is already registered");
    }

    @Test
    void loginWithValidCredentialsReturnsTokenAndProfile() {
        UserAccount user = user("Grace Hopper", "grace@example.com", "valid-password", UserRole.ADMIN, true);
        when(userAccountRepository.findByEmailIgnoreCase("grace@example.com")).thenReturn(Optional.of(user));

        var response = authService.login(new LoginRequest("grace@example.com", "valid-password"));

        assertThat(response.accessToken()).isNotBlank();
        assertThat(response.user().email()).isEqualTo("grace@example.com");
        assertThat(response.user().role()).isEqualTo(UserRole.ADMIN);
        assertThat(response.toString()).doesNotContain(user.getPasswordHash());
    }

    @Test
    void loginWithInvalidCredentialsReturnsUnauthorized() {
        UserAccount user = user("Grace Hopper", "grace@example.com", "valid-password", UserRole.ADMIN, true);
        when(userAccountRepository.findByEmailIgnoreCase("grace@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("grace@example.com", "wrong-password")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid email or password");
    }

    @Test
    void disabledAccountCannotLogin() {
        UserAccount user = user("Grace Hopper", "grace@example.com", "valid-password", UserRole.ADMIN, false);
        when(userAccountRepository.findByEmailIgnoreCase("grace@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("grace@example.com", "valid-password")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Account is disabled");
    }

    @Test
    void jwtContainsExpectedSubjectAndRoleClaims() {
        UserAccount user = user("Grace Hopper", "grace@example.com", "valid-password", UserRole.ADMIN, true);

        String token = jwtService.generateToken(user);
        var claims = jwtService.validateToken(token);

        assertThat(claims.subject()).isEqualTo("grace@example.com");
        assertThat(claims.userId()).isEqualTo(user.getId());
        assertThat(claims.role()).isEqualTo(UserRole.ADMIN.name());
    }

    private UserAccount user(String displayName, String email, String password, UserRole role, boolean enabled) {
        UserAccount user = new UserAccount(displayName, email, passwordEncoder.encode(password), role);
        user.setEnabled(enabled);
        setId(user, UUID.randomUUID());
        return user;
    }

    private void setId(UserAccount user, UUID id) {
        ReflectionTestUtils.setField(user, "id", id);
    }
}
