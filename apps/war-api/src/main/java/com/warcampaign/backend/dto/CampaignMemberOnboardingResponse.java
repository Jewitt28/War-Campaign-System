package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignMemberActivationStatus;
import com.warcampaign.backend.domain.enums.CampaignMemberOnboardingStatus;

import java.time.Instant;

public record CampaignMemberOnboardingResponse(CampaignMemberOnboardingStatus onboardingStatus,
                                               CampaignMemberActivationStatus activationStatus,
                                               Integer activationTurnNumber,
                                               Instant tutorialCompletedAt,
                                               String tutorialVersion) {
}
