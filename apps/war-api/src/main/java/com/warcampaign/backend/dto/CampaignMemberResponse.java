package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignRole;

import java.util.UUID;

public record CampaignMemberResponse(UUID id,
                                     UUID userId,
                                     String email,
                                     String displayName,
                                     CampaignRole role,
                                     UUID factionId,
                                     UUID nationId) {
}
