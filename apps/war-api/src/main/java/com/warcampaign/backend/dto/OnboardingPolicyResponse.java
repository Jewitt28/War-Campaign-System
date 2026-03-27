package com.warcampaign.backend.dto;

public record OnboardingPolicyResponse(boolean allowCustomNationCreation,
                                       boolean allowPlayerCreatedFactions,
                                       boolean allowImmediateActivation) {
}
