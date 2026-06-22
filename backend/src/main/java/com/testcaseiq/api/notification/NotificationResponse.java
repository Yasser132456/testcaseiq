package com.testcaseiq.api.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String message,
        NotificationType type,
        boolean read,
        Instant createdAt
) {
    static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getMessage(),
                notification.getType(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
