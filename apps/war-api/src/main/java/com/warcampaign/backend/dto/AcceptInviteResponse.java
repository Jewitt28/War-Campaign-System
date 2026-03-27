package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignRole;

import java.util.UUID;

import com.warcampaign.backend.domain.enums.CampaignMemberActivationStatus;

public record AcceptInviteResponse(UUID campaignId,
                                   UUID membershipId,
                                   CampaignRole role,
                                   String intendedFactionKey,
                                   String intendedNationKey,
                                   String status,
                                   boolean onboardingRequired,
                                   CampaignMemberActivationStatus activationStatus,
                                   String redirectPath) {
}
