package com.testcaseiq.api.notification;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.testcaseiq.api.user.UserAccount;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole('ADMIN', 'QA_ENGINEER', 'VIEWER')")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponse> latest(@AuthenticationPrincipal UserAccount user) {
        return notificationService.latestForUser(user.getId());
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal UserAccount user) {
        return notificationService.unreadCount(user.getId());
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal UserAccount user) {
        notificationService.markAllRead(user.getId());
        return ResponseEntity.noContent().build();
    }
}
