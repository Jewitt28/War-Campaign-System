package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignPhase;

import java.util.List;
import java.util.UUID;

public record CampaignResolutionResponse(UUID campaignId,
                                         int turnNumber,
                                         CampaignPhase currentPhase,
                                         int revealedSubmissionCount,
                                         int battleCount,
                                         int eventCount,
                                         List<ResolutionSubmissionSummaryResponse> submissions,
                                         List<BattleSummaryResponse> battles,
                                         List<ResolutionEventResponse> events) {
}
