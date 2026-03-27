package com.warcampaign.backend.dto;

import java.util.UUID;

public record SelectOnboardingFactionRequest(UUID factionId,
                                             String customFactionName,
                                             String customFactionColor) {
}
