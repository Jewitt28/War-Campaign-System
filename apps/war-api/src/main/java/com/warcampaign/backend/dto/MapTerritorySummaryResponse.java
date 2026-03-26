package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;

import java.util.UUID;

public record MapTerritorySummaryResponse(UUID id,
                                          String key,
                                          String name,
                                          UUID theatreId,
                                          TerritoryStrategicStatus strategicStatus,
                                          UUID controllingFactionId,
                                          UUID controllerNationId,
                                          int fortLevel,
                                          String supplyStatus) {
}
