package com.testcaseiq.api.ai.provider;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.testcaseiq.api.ai.prompt.AiPromptTemplates;

@Configuration
@EnableConfigurationProperties(AiProviderProperties.class)
public class AiProviderConfiguration {

    @Bean
    @ConditionalOnProperty(name = "ai.provider", havingValue = "mock", matchIfMissing = true)
    AiGenerationProvider mockAiGenerationProvider() {
        return new MockAiGenerationProvider();
    }

    @Bean
    @ConditionalOnProperty(name = "ai.provider", havingValue = "openai")
    AiGenerationProvider openAiGenerationProvider(
            AiChatClient aiChatClient,
            ObjectMapper objectMapper,
            AiPromptTemplates promptTemplates,
            AiProviderProperties properties
    ) {
        String apiKey = properties.getOpenai().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("AI_PROVIDER=openai requires OPENAI_API_KEY or ai.openai.api-key");
        }
        return new OpenAiGenerationProvider(
                aiChatClient,
                objectMapper,
                promptTemplates,
                properties.getOpenai().getModel()
        );
    }

    @Bean
    @ConditionalOnMissingBean(AiChatClient.class)
    @ConditionalOnProperty(name = "ai.provider", havingValue = "openai")
    AiChatClient springAiChatClient(ChatClient.Builder chatClientBuilder) {
        return new SpringAiChatClient(chatClientBuilder.build());
    }
}
