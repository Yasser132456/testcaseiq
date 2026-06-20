package com.testcaseiq.api.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security")
public record SecurityProperties(
        boolean enforceAuth,
        String jwtSecret,
        long accessTokenExpirationSeconds
) {

    public SecurityProperties {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            jwtSecret = "testcaseiq-local-development-jwt-secret-change-me";
        }
        if (accessTokenExpirationSeconds <= 0) {
            accessTokenExpirationSeconds = 3600;
        }
    }
}
