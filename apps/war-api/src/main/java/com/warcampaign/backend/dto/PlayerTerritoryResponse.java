package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;

import java.util.UUID;

public record PlayerTerritoryResponse(UUID id,
                                      String key,
                                      String name,
                                      MapTheatreResponse theatre,
                                      String terrainType,
                                      String strategicTagsJson,
                                      int baseIndustry,
                                      int baseManpower,
                                      boolean hasPort,
                                      boolean hasAirfield,
                                      int maxFortLevel,
                                      TerritoryStrategicStatus strategicStatus,
                                      int fortLevel,
                                      String supplyStatus,
                                      MapFactionReferenceResponse controllingFaction,
                                      MapNationReferenceResponse controllerNation) {
}
