package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;

import java.util.UUID;

public record PlayerPlatoonDetailResponse(UUID id,
                                          String key,
                                          String name,
                                          String unitType,
                                          MapFactionReferenceResponse faction,
                                          MapNationReferenceResponse nation,
                                          PlatoonTerritoryReferenceResponse homeTerritory,
                                          PlatoonTerritoryReferenceResponse currentTerritory,
                                          PlatoonReadinessStatus readinessStatus,
                                          int strength) {
}
