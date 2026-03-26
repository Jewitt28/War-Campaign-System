package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.PlatoonCondition;

import java.util.List;
import java.util.UUID;

public record CreateCampaignPlatoonRequest(String platoonKey,
                                           String name,
                                           UUID factionId,
                                           UUID nationId,
                                           UUID homeTerritoryId,
                                           String unitType,
                                           PlatoonCondition condition,
                                           Integer strength,
                                           Integer mpBase,
                                           List<String> traits,
                                           Boolean entrenched,
                                           Boolean hiddenFromPlayers) {
}
