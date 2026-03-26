package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.PlatoonCondition;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;

import java.util.List;
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
                                          PlatoonCondition condition,
                                          int strength,
                                          int mpBase,
                                          List<String> traits,
                                          boolean entrenched) implements PlatoonDetailResponse {
}
