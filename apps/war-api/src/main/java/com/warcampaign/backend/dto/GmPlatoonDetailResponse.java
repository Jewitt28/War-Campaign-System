package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.PlatoonCondition;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;

import java.util.List;
import java.util.UUID;

public record GmPlatoonDetailResponse(UUID id,
                                      String key,
                                      String name,
                                      String unitType,
                                      boolean hiddenFromPlayers,
                                      MapFactionReferenceResponse faction,
                                      MapNationReferenceResponse nation,
                                      PlatoonMemberReferenceResponse assignedMember,
                                      PlatoonTerritoryReferenceResponse homeTerritory,
                                      PlatoonTerritoryReferenceResponse currentTerritory,
                                      PlatoonReadinessStatus readinessStatus,
                                      PlatoonCondition condition,
                                      int strength,
                                      int mpBase,
                                      List<String> traits,
                                      boolean entrenched,
                                      String notes) implements PlatoonDetailResponse {
}
