package com.warcampaign.backend.dto;

public record UpdateOnboardingPolicyRequest(Boolean allowCustomNationCreation,
                                            Boolean allowPlayerCreatedFactions,
                                            Boolean allowImmediateActivation) {
}
