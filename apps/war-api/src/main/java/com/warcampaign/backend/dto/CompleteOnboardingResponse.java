package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignMemberActivationStatus;
import com.warcampaign.backend.domain.enums.CampaignMemberOnboardingStatus;

import java.util.UUID;

public record CompleteOnboardingResponse(UUID campaignId,
                                         UUID membershipId,
                                         CampaignMemberOnboardingStatus onboardingStatus,
                                         CampaignMemberActivationStatus activationStatus,
                                         Integer activationTurnNumber,
                                         String redirectPath,
                                         String starterPlatoonName) {
}
