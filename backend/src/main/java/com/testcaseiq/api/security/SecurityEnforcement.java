package com.testcaseiq.api.security;

public class SecurityEnforcement {

    private final SecurityProperties securityProperties;

    public SecurityEnforcement(SecurityProperties securityProperties) {
        this.securityProperties = securityProperties;
    }

    public boolean isEnforced() {
        return securityProperties.enforceAuth();
    }
}
