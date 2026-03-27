package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignMemberActivationStatus;
import com.warcampaign.backend.domain.enums.CampaignMemberOnboardingStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CampaignOnboardingResponse(UUID campaignId,
                                         UUID membershipId,
                                         CampaignMemberOnboardingStatus status,
                                         CampaignMemberActivationStatus activationStatus,
                                         Integer activationTurnNumber,
                                         String nextStep,
                                         OnboardingPolicyResponse settings,
                                         OnboardingOptionResponse selectedFaction,
                                         OnboardingOptionResponse selectedNation,
                                         OnboardingHomelandOptionResponse selectedHomeland,
                                         List<OnboardingOptionResponse> eligibleFactions,
                                         List<OnboardingOptionResponse> eligibleNations,
                                         List<OnboardingHomelandOptionResponse> eligibleHomelands,
                                         String starterPlatoonName,
                                         Instant tutorialCompletedAt,
                                         String tutorialVersion) {
}
