package com.testcaseiq.api.ai.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.ai.dto.GeneratedTestSuiteResult;
import com.testcaseiq.api.ai.dto.StoryAnalysisResult;
import com.testcaseiq.api.ai.service.AiGenerationService;

@RestController
@RequestMapping("/api/stories/{storyId}")
public class AiController {

    private final AiGenerationService aiGenerationService;

    public AiController(AiGenerationService aiGenerationService) {
        this.aiGenerationService = aiGenerationService;
    }

    @PostMapping("/analyze")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<StoryAnalysisResult> analyzeStory(@PathVariable UUID storyId) {
        return ResponseEntity.ok(aiGenerationService.analyzeStory(storyId));
    }

    @PostMapping("/generate-tests")
    @org.springframework.security.access.prepost.PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER')")
    public ResponseEntity<GeneratedTestSuiteResult> generateTests(@PathVariable UUID storyId) {
        return ResponseEntity.ok(aiGenerationService.generateTestCases(storyId));
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
