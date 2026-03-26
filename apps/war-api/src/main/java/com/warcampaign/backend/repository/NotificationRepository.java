package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Notification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @EntityGraph(attributePaths = {"campaign", "recipientUser"})
    List<Notification> findAllByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId);

    @EntityGraph(attributePaths = {"campaign", "recipientUser"})
    Optional<Notification> findByIdAndRecipientUserId(UUID notificationId, UUID recipientUserId);
}
