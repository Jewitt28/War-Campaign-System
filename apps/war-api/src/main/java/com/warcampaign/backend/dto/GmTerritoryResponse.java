package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;

import java.util.UUID;

public record GmTerritoryResponse(UUID id,
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
                                  int partisanRisk,
                                  String supplyStatus,
                                  String damageJson,
                                  String notes,
                                  String metadataJson,
                                  MapFactionReferenceResponse controllingFaction,
                                  MapNationReferenceResponse controllerNation) {
}
