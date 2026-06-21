package com.testcaseiq.api.settings;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.testcaseiq.api.ai.provider.AiProviderProperties;
import com.testcaseiq.api.common.error.BadRequestException;
import com.testcaseiq.api.domain.enums.GenerationMode;
import com.testcaseiq.api.security.SecurityProperties;

@Service
public class AppSettingsService {

    private final AppSettingsRepository settingsRepository;
    private final SecurityProperties securityProperties;

    public AppSettingsService(AppSettingsRepository settingsRepository, SecurityProperties securityProperties) {
        this.settingsRepository = settingsRepository;
        this.securityProperties = securityProperties;
    }

    @Transactional(readOnly = true)
    public AppSettingsDto getSettings() {
        return toDto(loadOrCreate());
    }

    @Transactional
    public AppSettingsDto updateSettings(AppSettingsUpdateRequest request) {
        AppSettings settings = loadOrCreate();

        if (request.activeProvider() != null) {
            try {
                settings.setActiveProvider(AiProviderProperties.Provider.valueOf(request.activeProvider()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid activeProvider: " + request.activeProvider());
            }
        }
        if (request.generationMode() != null) {
            try {
                settings.setGenerationMode(GenerationMode.valueOf(request.generationMode()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid generationMode: " + request.generationMode());
            }
        }
        if (request.maxTestCasesPerStory() != null) {
            int max = request.maxTestCasesPerStory();
            if (max < 1 || max > 50) {
                throw new BadRequestException("maxTestCasesPerStory must be between 1 and 50");
            }
            settings.setMaxTestCasesPerStory(max);
        }
        if (request.enableExplainability() != null) {
            settings.setEnableExplainability(request.enableExplainability());
        }
        if (request.enableQualityScoring() != null) {
            settings.setEnableQualityScoring(request.enableQualityScoring());
        }
        if (request.requireReviewBeforeExport() != null) {
            settings.setRequireReviewBeforeExport(request.requireReviewBeforeExport());
        }
        if (request.enforceAcceptanceCriteriaMapping() != null) {
            settings.setEnforceAcceptanceCriteriaMapping(request.enforceAcceptanceCriteriaMapping());
        }

        return toDto(settingsRepository.save(settings));
    }

    private AppSettings loadOrCreate() {
        return settingsRepository.findFirst().orElseGet(() -> settingsRepository.save(new AppSettings()));
    }

    private AppSettingsDto toDto(AppSettings s) {
        return new AppSettingsDto(
                s.getActiveProvider().name(),
                s.getGenerationMode().name(),
                s.getMaxTestCasesPerStory(),
                s.isEnableExplainability(),
                s.isEnableQualityScoring(),
                s.isRequireReviewBeforeExport(),
                s.isEnforceAcceptanceCriteriaMapping(),
                securityProperties.enforceAuth()
        );
    }
}
