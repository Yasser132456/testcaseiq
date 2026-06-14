package com.testcaseiq.api.ai.provider;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.ai.prompt.AiPromptTemplates;

class AiProviderConfigurationTests {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(AiProviderConfiguration.class)
            .withBean(ObjectMapper.class, ObjectMapper::new)
            .withBean(AiPromptTemplates.class, () -> new AiPromptTemplates("analysis prompt", "generation prompt"));

    @Test
    void mockProviderIsDefaultWhenProviderIsNotConfigured() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(AiGenerationProvider.class);
            assertThat(context.getBean(AiGenerationProvider.class)).isInstanceOf(MockAiGenerationProvider.class);
        });
    }

    @Test
    void mockProviderIsSelectedExplicitly() {
        contextRunner
                .withPropertyValues("ai.provider=mock")
                .run(context -> {
                    assertThat(context).hasSingleBean(AiGenerationProvider.class);
                    assertThat(context.getBean(AiGenerationProvider.class)).isInstanceOf(MockAiGenerationProvider.class);
                });
    }

    @Test
    void openAiProviderIsSelectedWhenConfigured() {
        contextRunner
                .withBean(AiChatClient.class, () -> prompt -> "{}")
                .withPropertyValues(
                        "ai.provider=openai",
                        "ai.openai.api-key=test-key",
                        "ai.openai.model=gpt-test"
                )
                .run(context -> {
                    assertThat(context).hasSingleBean(AiGenerationProvider.class);
                    assertThat(context.getBean(AiGenerationProvider.class)).isInstanceOf(OpenAiGenerationProvider.class);
                });
    }

    @Test
    void openAiProviderFailsFastWithoutApiKey() {
        contextRunner
                .withBean(AiChatClient.class, () -> prompt -> "{}")
                .withPropertyValues("ai.provider=openai")
                .run(context -> assertThat(context).hasFailed());
    }
}
