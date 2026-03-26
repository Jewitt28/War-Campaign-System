package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.PlatoonOrderType;

import java.util.UUID;

public record OrderLineRequest(UUID platoonId,
                               PlatoonOrderType orderType,
                               UUID sourceTerritoryId,
                               UUID targetTerritoryId,
                               String payloadJson) {
}
