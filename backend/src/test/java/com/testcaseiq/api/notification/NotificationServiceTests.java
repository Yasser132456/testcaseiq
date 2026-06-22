package com.testcaseiq.api.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTests {

    @Mock
    private NotificationRepository notificationRepository;

    @Test
    void returnsLatestTwentyNotificationsForCurrentUser() {
        UUID userId = UUID.randomUUID();
        Notification notification = new Notification(userId, "Suite generated", NotificationType.SUITE_GENERATED);
        ReflectionTestUtils.setField(notification, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(notification, "createdAt", Instant.parse("2026-06-22T10:15:30Z"));
        given(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any(Pageable.class)))
                .willReturn(List.of(notification));
        NotificationService service = new NotificationService(notificationRepository);

        List<NotificationResponse> response = service.latestForUser(userId);

        assertThat(response).singleElement()
                .satisfies(item -> {
                    assertThat(item.message()).isEqualTo("Suite generated");
                    assertThat(item.type()).isEqualTo(NotificationType.SUITE_GENERATED);
                    assertThat(item.read()).isFalse();
                    assertThat(item.createdAt()).isEqualTo(Instant.parse("2026-06-22T10:15:30Z"));
                });
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(notificationRepository).findByUserIdOrderByCreatedAtDesc(eq(userId), captor.capture());
        assertThat(captor.getValue().getPageSize()).isEqualTo(20);
    }

    @Test
    void delegatesUnreadCountAndBulkMarkReadToRepository() {
        UUID userId = UUID.randomUUID();
        given(notificationRepository.countByUserIdAndReadFalse(userId)).willReturn(3L);
        NotificationService service = new NotificationService(notificationRepository);

        assertThat(service.unreadCount(userId).count()).isEqualTo(3);
        service.markAllRead(userId);

        verify(notificationRepository).markAllReadForUser(userId);
    }
}
