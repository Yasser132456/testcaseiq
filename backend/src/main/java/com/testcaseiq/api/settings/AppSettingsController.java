package com.testcaseiq.api.settings;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.audit.AuditAction;
import com.testcaseiq.api.audit.AuditOutcome;
import com.testcaseiq.api.audit.AuditService;

@RestController
@RequestMapping("/api/settings")
public class AppSettingsController {

    private final AppSettingsService settingsService;
    private final AuditService auditService;

    public AppSettingsController(AppSettingsService settingsService, AuditService auditService) {
        this.settingsService = settingsService;
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<AppSettingsDto> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PatchMapping
    @PreAuthorize("hasRole('ADMIN') or !@securityEnforcement.isEnforced()")
    public ResponseEntity<AppSettingsDto> updateSettings(@RequestBody AppSettingsUpdateRequest request) {
        String previousProvider = settingsService.getSettings().activeProvider();
        AppSettingsDto updated = settingsService.updateSettings(request);

        auditService.log(AuditAction.SETTINGS_UPDATED, "SETTINGS", "global",
                AuditOutcome.SUCCESS, "Application settings updated");

        if (!updated.activeProvider().equals(previousProvider)) {
            auditService.log(AuditAction.AI_PROVIDER_CHANGED, "SETTINGS", "global",
                    AuditOutcome.SUCCESS, "AI provider changed to " + updated.activeProvider(),
                    Map.of("from", previousProvider, "to", updated.activeProvider()));
        }

        if (request.requireReviewBeforeExport() != null || request.enforceAcceptanceCriteriaMapping() != null) {
            auditService.log(AuditAction.QA_RULES_CHANGED, "SETTINGS", "global",
                    AuditOutcome.SUCCESS, "QA behavior settings updated");
        }

        return ResponseEntity.ok(updated);
    }
}
