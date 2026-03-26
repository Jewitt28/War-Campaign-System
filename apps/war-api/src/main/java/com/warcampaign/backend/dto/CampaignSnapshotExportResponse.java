package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CampaignSnapshotExportResponse(UUID campaignId,
                                             String campaignName,
                                             CampaignStatus campaignStatus,
                                             int currentTurnNumber,
                                             CampaignPhase currentPhase,
                                             Instant exportedAt,
                                             List<CampaignMemberResponse> members,
                                             List<MapTerritorySummaryResponse> territories,
                                             List<PlayerPlatoonSummaryResponse> platoons,
                                             List<BattleSummaryResponse> battles,
                                             List<ResolutionEventResponse> resolutionEvents,
                                             List<CampaignAuditLogResponse> auditLog) {
}
