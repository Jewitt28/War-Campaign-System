package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;

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
                                      int strength,
                                      String notes) {
}
