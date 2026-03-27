package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignStatus;

import java.util.UUID;

public record CampaignLifecycleResponse(UUID campaignId,
                                        String campaignName,
                                        CampaignStatus campaignStatus,
                                        CampaignPhase currentPhase,
                                        int currentTurnNumber) {
}
