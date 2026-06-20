package com.testcaseiq.api.auth.dto;

import java.time.Instant;
import java.util.UUID;

import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserRole;

public record UserProfileResponse(
        UUID id,
        String displayName,
        String email,
        UserRole role,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt
) {

    public static UserProfileResponse from(UserAccount user) {
        return new UserProfileResponse(
                user.getId(),
                user.getDisplayName(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
