package com.testcaseiq.api.admin;

import com.testcaseiq.api.user.UserRole;

import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(@NotNull UserRole role) {}
