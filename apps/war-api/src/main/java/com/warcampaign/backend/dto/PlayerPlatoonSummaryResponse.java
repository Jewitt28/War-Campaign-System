package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;

import java.util.UUID;

public record PlayerPlatoonSummaryResponse(UUID id,
                                           String key,
                                           String name,
                                           String unitType,
                                           MapFactionReferenceResponse faction,
                                           MapNationReferenceResponse nation,
                                           PlatoonTerritoryReferenceResponse currentTerritory,
                                           PlatoonReadinessStatus readinessStatus,
                                           int strength) {
}
