package com.testcaseiq.api.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.audit.AuditAction;
import com.testcaseiq.api.audit.AuditOutcome;
import com.testcaseiq.api.audit.AuditService;
import com.testcaseiq.api.user.UserAccount;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final AuditService auditService;

    public AdminUserController(AdminUserService adminUserService, AuditService auditService) {
        this.adminUserService = adminUserService;
        this.auditService = auditService;
    }

    @GetMapping
    public List<AdminUserResponse> listUsers() {
        return adminUserService.listUsers();
    }

    @PatchMapping("/{userId}/role")
    public AdminUserResponse updateRole(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal UserAccount currentUser
    ) {
        AdminUserResponse response = adminUserService.updateRole(userId, currentUser.getId(), request.role());
        auditService.log(AuditAction.USER_ROLE_CHANGED, "USER", userId.toString(), AuditOutcome.SUCCESS,
                "Role changed to " + request.role().name());
        return response;
    }

    @PatchMapping("/{userId}/status")
    public AdminUserResponse updateStatus(
            @PathVariable UUID userId,
            @RequestBody UpdateStatusRequest request,
            @AuthenticationPrincipal UserAccount currentUser
    ) {
        AdminUserResponse response = adminUserService.updateStatus(userId, currentUser.getId(), request.enabled());
        auditService.log(AuditAction.USER_STATUS_CHANGED, "USER", userId.toString(), AuditOutcome.SUCCESS,
                request.enabled() ? "Account enabled" : "Account disabled");
        return response;
    }
}
