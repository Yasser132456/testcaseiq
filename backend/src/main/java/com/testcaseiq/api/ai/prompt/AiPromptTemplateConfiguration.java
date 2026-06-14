package com.testcaseiq.api.ai.prompt;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

@Configuration
public class AiPromptTemplateConfiguration {

    @Bean
    AiPromptTemplates aiPromptTemplates(ResourceLoader resourceLoader) {
        return new AiPromptTemplates(
                read(resourceLoader, "classpath:prompts/story-analysis-system.txt"),
                read(resourceLoader, "classpath:prompts/test-generation-system.txt")
        );
    }

    private String read(ResourceLoader resourceLoader, String location) {
        Resource resource = resourceLoader.getResource(location);
        try {
            return resource.getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException("Unable to read AI prompt template: " + location, exception);
        }
    }
}
