package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.AuditActorType;

import java.time.Instant;
import java.util.UUID;

public record CampaignAuditLogResponse(UUID auditLogId,
                                       AuditActorType actorType,
                                       UUID actorUserId,
                                       String actorDisplayName,
                                       UUID actorMemberId,
                                       String actionType,
                                       String entityType,
                                       UUID entityId,
                                       String beforeJson,
                                       String afterJson,
                                       Instant createdAt) {
}
