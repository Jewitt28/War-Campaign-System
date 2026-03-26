package com.warcampaign.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record CampaignChatMessageResponse(UUID messageId,
                                          UUID authorMemberId,
                                          String authorDisplayName,
                                          String message,
                                          Instant createdAt) {
}
