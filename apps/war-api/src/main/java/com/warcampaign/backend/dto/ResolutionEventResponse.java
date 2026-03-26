package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.ResolutionEventCreatedByType;
import com.warcampaign.backend.domain.enums.ResolutionVisibilityScope;

import java.time.Instant;
import java.util.UUID;

public record ResolutionEventResponse(UUID eventId,
                                      String eventType,
                                      ResolutionVisibilityScope visibilityScope,
                                      UUID territoryId,
                                      String territoryName,
                                      UUID actorFactionId,
                                      String actorFactionName,
                                      UUID targetFactionId,
                                      String targetFactionName,
                                      String payloadJson,
                                      ResolutionEventCreatedByType createdByType,
                                      UUID createdByMemberId,
                                      Instant createdAt) {
}
