package com.testcaseiq.api.admin;

import java.time.Instant;
import java.util.UUID;

import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserRole;

public record AdminUserResponse(
        UUID id,
        String displayName,
        String email,
        UserRole role,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt
) {

    public static AdminUserResponse from(UserAccount user) {
        return new AdminUserResponse(
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
