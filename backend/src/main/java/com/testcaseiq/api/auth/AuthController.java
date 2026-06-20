package com.testcaseiq.api.auth;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.audit.AuditAction;
import com.testcaseiq.api.audit.AuditOutcome;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.auth.dto.AuthResponse;
import com.testcaseiq.api.auth.dto.LoginRequest;
import com.testcaseiq.api.auth.dto.RegisterRequest;
import com.testcaseiq.api.auth.dto.UserProfileResponse;
import com.testcaseiq.api.user.UserAccount;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuditService auditService;

    public AuthController(AuthService authService, AuditService auditService) {
        this.authService = authService;
        this.auditService = auditService;
    }

    @PostMapping("/register")
    ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        auditService.log(AuditAction.USER_REGISTERED, "USER",
                response.user().id().toString(), AuditOutcome.SUCCESS, "User registered");
        return ResponseEntity.created(URI.create("/api/auth/me")).body(response);
    }

    @PostMapping("/login")
    AuthResponse login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            auditService.log(AuditAction.USER_LOGIN_SUCCESS, "USER",
                    response.user().id().toString(), AuditOutcome.SUCCESS, "Login successful");
            return response;
        } catch (Exception e) {
            auditService.log(AuditAction.USER_LOGIN_FAILED, "USER",
                    null, AuditOutcome.FAILURE, "Login failed");
            throw e;
        }
    }

    @GetMapping("/me")
    UserProfileResponse me(@AuthenticationPrincipal UserAccount user) {
        return authService.profile(user);
    }
}
