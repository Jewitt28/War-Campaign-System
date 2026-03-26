package com.warcampaign.backend.dto;

import java.util.UUID;

public record MapNationReferenceResponse(UUID id,
                                         UUID factionId,
                                         String key,
                                         String name) {
}
