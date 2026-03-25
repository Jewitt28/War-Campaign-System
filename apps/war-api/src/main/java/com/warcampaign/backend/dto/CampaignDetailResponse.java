package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignPhase;

import java.util.List;
import java.util.UUID;

public record CampaignDetailResponse(UUID id,
                                     String name,
                                     CampaignPhase currentPhase,
                                     UUID createdByUserId,
                                     String createdByDisplayName,
                                     long memberCount,
                                     CampaignMemberResponse myMembership,
                                     List<CampaignFactionResponse> factions) {
}
