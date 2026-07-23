package com.testcaseiq.api.story;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
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
import com.testcaseiq.api.story.dto.AmbiguityResolutionRequest;
import com.testcaseiq.api.story.dto.AmbiguityResponse;
import com.testcaseiq.api.user.UserAccount;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AmbiguityController {

    private final AmbiguityService ambiguityService;
    private final AuditService auditService;

    public AmbiguityController(AmbiguityService ambiguityService, AuditService auditService) {
        this.ambiguityService = ambiguityService;
        this.auditService = auditService;
    }

    @GetMapping("/stories/{storyId}/ambiguities")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public List<AmbiguityResponse> listForStory(@PathVariable UUID storyId) {
        return ambiguityService.listForStory(storyId);
    }

    @PatchMapping("/stories/{storyId}/ambiguities/{ambiguityId}")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<AmbiguityResponse> resolve(
            @PathVariable UUID storyId,
            @PathVariable UUID ambiguityId,
            @Valid @RequestBody AmbiguityResolutionRequest request,
            @AuthenticationPrincipal UserAccount user
    ) {
        String actorEmail = user != null ? user.getEmail() : null;
        AmbiguityResponse response = ambiguityService.resolve(storyId, ambiguityId, request, actorEmail);
        auditService.log(AuditAction.AMBIGUITY_RESOLVED, "AMBIGUITY", ambiguityId.toString(), AuditOutcome.SUCCESS,
                null, Map.of("status", request.status().name()));
        return ResponseEntity.ok(response);
    }
}
