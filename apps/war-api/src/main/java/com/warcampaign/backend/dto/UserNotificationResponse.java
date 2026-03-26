package com.warcampaign.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record UserNotificationResponse(UUID id,
                                       UUID campaignId,
                                       String type,
                                       String title,
                                       String body,
                                       String payloadJson,
                                       Instant readAt,
                                       Instant createdAt) {
}
