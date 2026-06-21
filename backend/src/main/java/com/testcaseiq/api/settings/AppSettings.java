package com.testcaseiq.api.settings;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.UpdateTimestamp;

import com.testcaseiq.api.ai.provider.AiProviderProperties;
import com.testcaseiq.api.domain.enums.GenerationMode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "app_settings")
public class AppSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "active_provider", length = 32, nullable = false)
    private AiProviderProperties.Provider activeProvider = AiProviderProperties.Provider.MOCK;

    @Enumerated(EnumType.STRING)
    @Column(name = "generation_mode", length = 32, nullable = false)
    private GenerationMode generationMode = GenerationMode.BALANCED;

    @Column(name = "max_test_cases_per_story", nullable = false)
    private int maxTestCasesPerStory = 10;

    @Column(name = "enable_explainability", nullable = false)
    private boolean enableExplainability = true;

    @Column(name = "enable_quality_scoring", nullable = false)
    private boolean enableQualityScoring = true;

    @Column(name = "require_review_before_export", nullable = false)
    private boolean requireReviewBeforeExport = false;

    @Column(name = "enforce_acceptance_criteria_mapping", nullable = false)
    private boolean enforceAcceptanceCriteriaMapping = false;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }

    public AiProviderProperties.Provider getActiveProvider() { return activeProvider; }
    public void setActiveProvider(AiProviderProperties.Provider activeProvider) { this.activeProvider = activeProvider; }

    public GenerationMode getGenerationMode() { return generationMode; }
    public void setGenerationMode(GenerationMode generationMode) { this.generationMode = generationMode; }

    public int getMaxTestCasesPerStory() { return maxTestCasesPerStory; }
    public void setMaxTestCasesPerStory(int maxTestCasesPerStory) { this.maxTestCasesPerStory = maxTestCasesPerStory; }

    public boolean isEnableExplainability() { return enableExplainability; }
    public void setEnableExplainability(boolean enableExplainability) { this.enableExplainability = enableExplainability; }

    public boolean isEnableQualityScoring() { return enableQualityScoring; }
    public void setEnableQualityScoring(boolean enableQualityScoring) { this.enableQualityScoring = enableQualityScoring; }

    public boolean isRequireReviewBeforeExport() { return requireReviewBeforeExport; }
    public void setRequireReviewBeforeExport(boolean requireReviewBeforeExport) { this.requireReviewBeforeExport = requireReviewBeforeExport; }

    public boolean isEnforceAcceptanceCriteriaMapping() { return enforceAcceptanceCriteriaMapping; }
    public void setEnforceAcceptanceCriteriaMapping(boolean enforceAcceptanceCriteriaMapping) { this.enforceAcceptanceCriteriaMapping = enforceAcceptanceCriteriaMapping; }

    public Instant getUpdatedAt() { return updatedAt; }
}
