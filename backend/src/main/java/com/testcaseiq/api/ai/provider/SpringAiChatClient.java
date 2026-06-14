package com.testcaseiq.api.ai.provider;

import org.springframework.ai.chat.client.ChatClient;

public class SpringAiChatClient implements AiChatClient {

    private final ChatClient chatClient;

    public SpringAiChatClient(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @Override
    public String call(String prompt) {
        return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
    }
}
