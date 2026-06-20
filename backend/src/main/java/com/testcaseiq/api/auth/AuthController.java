package com.testcaseiq.api.auth;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.created(URI.create("/api/auth/me")).body(response);
    }

    @PostMapping("/login")
    AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    UserProfileResponse me(@AuthenticationPrincipal UserAccount user) {
        return authService.profile(user);
    }
}
