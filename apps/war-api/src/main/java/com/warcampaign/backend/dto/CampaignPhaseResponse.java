package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignPhase;

import java.time.Instant;
import java.util.UUID;

public record CampaignPhaseResponse(UUID campaignId,
                                    int currentTurnNumber,
                                    CampaignPhase currentPhase,
                                    Instant phaseStartedAt,
                                    Instant phaseEndsAt) {
}
