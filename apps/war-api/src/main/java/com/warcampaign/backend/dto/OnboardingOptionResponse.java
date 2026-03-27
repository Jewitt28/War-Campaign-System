package com.warcampaign.backend.dto;

import java.util.UUID;

public record OnboardingOptionResponse(UUID id,
                                       String key,
                                       String name,
                                       UUID factionId,
                                       String factionKey,
                                       String color,
                                       boolean custom) {
}
