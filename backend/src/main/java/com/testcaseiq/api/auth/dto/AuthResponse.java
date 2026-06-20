package com.testcaseiq.api.auth.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        UserProfileResponse user
) {

    public AuthResponse(String accessToken, UserProfileResponse user) {
        this(accessToken, "Bearer", 0, user);
    }
}
