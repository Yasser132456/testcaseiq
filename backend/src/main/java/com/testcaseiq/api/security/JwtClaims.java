package com.testcaseiq.api.security;

import java.time.Instant;
import java.util.UUID;

public record JwtClaims(
        String subject,
        UUID userId,
        String role,
        Instant expiresAt
) {
}
