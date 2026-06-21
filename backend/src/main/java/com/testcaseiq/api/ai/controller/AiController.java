package com.testcaseiq.api.ai.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.provider.AiProviderProperties;
import com.testcaseiq.api.ai.service.AiGenerationService;
import com.testcaseiq.api.audit.AuditAction;
import com.testcaseiq.api.audit.AuditOutcome;
import com.testcaseiq.api.audit.AuditService;

@RestController
@RequestMapping("/api/stories/{storyId}")
public class AiController {

    private final AiGenerationService aiGenerationService;
    private final AuditService auditService;
    private final AiProviderProperties aiProviderProperties;

    public AiController(AiGenerationService aiGenerationService, AuditService auditService,
                        AiProviderProperties aiProviderProperties) {
        this.aiGenerationService = aiGenerationService;
        this.auditService = auditService;
        this.aiProviderProperties = aiProviderProperties;
    }

    @PostMapping("/analyze")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<StoryAnalysisResult> analyzeStory(@PathVariable UUID storyId) {
        ResponseEntity<StoryAnalysisResult> result = ResponseEntity.ok(aiGenerationService.analyzeStory(storyId));
        auditService.log(AuditAction.STORY_ANALYSIS_REQUESTED, "STORY", storyId.toString(), AuditOutcome.SUCCESS, null,
                Map.of("storyId", storyId.toString(),
                        "aiProvider", aiProviderProperties.getProvider().name().toLowerCase()));
        return result;
    }

    @PostMapping("/generate-tests")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<GeneratedTestSuiteResult> generateTests(@PathVariable UUID storyId) {
        ResponseEntity<GeneratedTestSuiteResult> result = ResponseEntity.ok(aiGenerationService.generateTestCases(storyId));
        auditService.log(AuditAction.TEST_GENERATION_REQUESTED, "STORY", storyId.toString(), AuditOutcome.SUCCESS, null,
                Map.of("storyId", storyId.toString(),
                        "aiProvider", aiProviderProperties.getProvider().name().toLowerCase()));
        return result;
    }

    @GetMapping("/analysis")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public ResponseEntity<StoryAnalysisResult> getAnalysis(@PathVariable UUID storyId) {
        return ResponseEntity.ok(aiGenerationService.getAnalysis(storyId));
    }

    @GetMapping("/test-suites")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
    public ResponseEntity<List<GeneratedTestSuiteResult>> getTestSuites(@PathVariable UUID storyId) {
        return ResponseEntity.ok(aiGenerationService.getTestSuites(storyId));
    }
}
