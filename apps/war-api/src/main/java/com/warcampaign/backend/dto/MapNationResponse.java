package com.warcampaign.backend.dto;

import java.util.UUID;

public record MapNationResponse(UUID id,
                                UUID factionId,
                                String key,
                                String name,
                                boolean npc) {
}
