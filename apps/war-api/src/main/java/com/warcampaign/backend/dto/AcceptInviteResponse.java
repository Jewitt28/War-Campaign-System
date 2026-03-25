package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignRole;

import java.util.UUID;

public record AcceptInviteResponse(UUID campaignId,
                                   UUID membershipId,
                                   CampaignRole role,
                                   String intendedFactionKey,
                                   String intendedNationKey,
                                   String status) {
}
