package com.testcaseiq.api.ai.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.testcaseiq.api.ai.dto.GeneratedTestCaseDto;
import com.testcaseiq.api.ai.dto.GeneratedTestStepDto;
import com.testcaseiq.api.domain.enums.ConfidenceLevel;

/**
 * Deterministic quality scorer for AI-generated test cases.
 * Scores start at 100 and deduct for structural incompleteness.
 * Score range: 0–100. Confidence: >=80 HIGH, >=50 MEDIUM, else LOW.
 */
@Service
public class TestCaseQualityScoringService {

    public int score(GeneratedTestCaseDto dto) {
        int score = 100;

        if (isBlank(dto.title())) {
            score -= 20;
        }

        if (isBlank(dto.description())) {
            score -= 10;
        }

        List<GeneratedTestStepDto> steps = dto.steps() == null ? List.of() : dto.steps();
        if (steps.isEmpty()) {
            score -= 20;
        } else {
            long missingExpected = steps.stream()
                    .filter(step -> isBlank(step.expectedResult()))
                    .count();
            score -= (int) Math.min(missingExpected * 5L, 15);
        }

        boolean hasLinkedRequirements = dto.linkedRequirementReferences() != null
                && dto.linkedRequirementReferences().stream().anyMatch(ref -> !isBlank(ref));
        boolean hasBddScenario = !isBlank(dto.bddScenario());
        if (!hasLinkedRequirements && !hasBddScenario) {
            score -= 10;
        }

        if (dto.priority() == null) {
            score -= 5;
        }

        if (dto.riskLevel() == null) {
            score -= 5;
        }

        return Math.max(0, Math.min(100, score));
    }

    public ConfidenceLevel confidenceLevel(int score) {
        if (score >= 80) return ConfidenceLevel.HIGH;
        if (score >= 50) return ConfidenceLevel.MEDIUM;
        return ConfidenceLevel.LOW;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
