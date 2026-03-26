package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.PlatoonOrderType;
import com.warcampaign.backend.domain.enums.PlatoonOrderValidationStatus;

import java.time.Instant;
import java.util.UUID;

public record PlatoonOrderResponse(UUID id,
                                   UUID platoonId,
                                   String platoonKey,
                                   String platoonName,
                                   PlatoonOrderType orderType,
                                   UUID sourceTerritoryId,
                                   UUID targetTerritoryId,
                                   String payloadJson,
                                   PlatoonOrderValidationStatus validationStatus,
                                   String validationErrorsJson,
                                   Instant createdAt) {
}
