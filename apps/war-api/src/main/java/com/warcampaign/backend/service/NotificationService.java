package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Notification;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.dto.UserNotificationResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.NotificationRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final CampaignMemberRepository campaignMemberRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               CampaignMemberRepository campaignMemberRepository) {
        this.notificationRepository = notificationRepository;
        this.campaignMemberRepository = campaignMemberRepository;
    }

    @Transactional(readOnly = true)
    public List<UserNotificationResponse> listMyNotifications(AuthenticatedUser authenticatedUser) {
        return notificationRepository.findAllByRecipientUserIdOrderByCreatedAtDesc(authenticatedUser.id()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserNotificationResponse markAsRead(UUID notificationId, AuthenticatedUser authenticatedUser) {
        Notification notification = notificationRepository.findByIdAndRecipientUserId(notificationId, authenticatedUser.id())
                .orElseThrow(() -> new ApiException("NOTIFICATION_NOT_FOUND", HttpStatus.NOT_FOUND, "Notification not found"));
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }
        return toResponse(notification);
    }

    @Transactional
    public void notifyUser(Campaign campaign,
                           User recipient,
                           String type,
                           String title,
                           String body,
                           String payloadJson) {
        Notification notification = new Notification();
        notification.setCampaign(campaign);
        notification.setRecipientUser(recipient);
        notification.setType(type);
        notification.setTitle(title);
        notification.setBody(body);
        notification.setPayloadJson(payloadJson);
        notificationRepository.save(notification);
    }

    @Transactional
    public void notifyUsers(Campaign campaign,
                            Collection<User> recipients,
                            String type,
                            String title,
                            String body,
                            String payloadJson) {
        for (User recipient : recipients) {
            notifyUser(campaign, recipient, type, title, body, payloadJson);
        }
    }

    @Transactional
    public void notifyCampaignMembers(Campaign campaign,
                                      String type,
                                      String title,
                                      String body,
                                      String payloadJson) {
        List<User> recipients = campaignMemberRepository.findAllByCampaignIdWithUser(campaign.getId()).stream()
                .map(CampaignMember::getUser)
                .toList();
        notifyUsers(campaign, recipients, type, title, body, payloadJson);
    }

    private UserNotificationResponse toResponse(Notification notification) {
        return new UserNotificationResponse(
                notification.getId(),
                notification.getCampaign() != null ? notification.getCampaign().getId() : null,
                notification.getType(),
                notification.getTitle(),
                notification.getBody(),
                notification.getPayloadJson(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
