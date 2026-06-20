package com.testcaseiq.api.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.common.error.ResourceNotFoundException;
import com.testcaseiq.api.user.UserAccount;
import com.testcaseiq.api.user.UserAccountRepository;
import com.testcaseiq.api.user.UserRole;

@Service
public class AdminUserService {

    private final UserAccountRepository userAccountRepository;

    public AdminUserService(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {
        return userAccountRepository.findAll()
                .stream()
                .map(AdminUserResponse::from)
                .toList();
    }

    @Transactional
    public AdminUserResponse updateRole(UUID userId, UUID requestingUserId, UserRole newRole) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() == UserRole.ADMIN && newRole != UserRole.ADMIN) {
            long adminCount = userAccountRepository.countByRole(UserRole.ADMIN);
            if (adminCount == 1) {
                throw new BadRequestException("Cannot demote the last remaining administrator");
            }
        }

        user.setRole(newRole);
        return AdminUserResponse.from(userAccountRepository.save(user));
    }

    @Transactional
    public AdminUserResponse updateStatus(UUID userId, UUID requestingUserId, boolean enabled) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (userId.equals(requestingUserId)) {
            throw new BadRequestException("You cannot disable your own account");
        }

        if (!enabled && user.getRole() == UserRole.ADMIN) {
            long enabledAdminCount = userAccountRepository.countByRoleAndEnabled(UserRole.ADMIN, true);
            if (enabledAdminCount == 1) {
                throw new BadRequestException("Cannot disable the last active administrator");
            }
        }

        user.setEnabled(enabled);
        return AdminUserResponse.from(userAccountRepository.save(user));
    }
}
