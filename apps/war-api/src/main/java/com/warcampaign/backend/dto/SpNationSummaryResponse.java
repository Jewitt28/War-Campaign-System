package com.warcampaign.backend.dto;

import java.util.UUID;

public record SpNationSummaryResponse(
        UUID id,
        String nationKey,
        String name,
        String factionKey,
        String factionName,
        String color,
        String suggestedHomelandKey
) {
}
