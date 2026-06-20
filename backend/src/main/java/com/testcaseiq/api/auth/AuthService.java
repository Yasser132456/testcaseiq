package com.testcaseiq.api.auth;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.auth.dto.AuthResponse;
import com.testcaseiq.api.auth.dto.LoginRequest;
import com.testcaseiq.api.auth.dto.RegisterRequest;
import com.testcaseiq.api.auth.dto.UserProfileResponse;
import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.common.error.UnauthorizedException;
import com.testcaseiq.api.security.JwtService;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserAccountRepository userAccountRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userAccountRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("Email is already registered");
        }
        UserAccount user = new UserAccount(
                request.displayName().trim(),
                email,
                passwordEncoder.encode(request.password()),
                UserRole.QA_ENGINEER
        );
        UserAccount saved = userAccountRepository.save(user);
        return authResponse(saved);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));
        if (!user.isEnabled()) {
            throw new UnauthorizedException("Account is disabled");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }
        return authResponse(user);
    }

    public UserProfileResponse profile(UserAccount user) {
        return UserProfileResponse.from(user);
    }

    private AuthResponse authResponse(UserAccount user) {
        return new AuthResponse(
                jwtService.generateToken(user),
                "Bearer",
                jwtService.accessTokenExpirationSeconds(),
                UserProfileResponse.from(user)
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
