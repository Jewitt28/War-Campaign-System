package com.warcampaign.backend.controller;

import com.warcampaign.backend.dto.UserNotificationResponse;
import com.warcampaign.backend.service.AuthenticationService;
import com.warcampaign.backend.service.NotificationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final AuthenticationService authenticationService;

    public NotificationController(NotificationService notificationService,
                                  AuthenticationService authenticationService) {
        this.notificationService = notificationService;
        this.authenticationService = authenticationService;
    }

    @GetMapping
    public List<UserNotificationResponse> listMyNotifications() {
        return notificationService.listMyNotifications(authenticationService.currentUser());
    }

    @PostMapping("/{notificationId}/read")
    public UserNotificationResponse markAsRead(@PathVariable UUID notificationId) {
        return notificationService.markAsRead(notificationId, authenticationService.currentUser());
    }
}
