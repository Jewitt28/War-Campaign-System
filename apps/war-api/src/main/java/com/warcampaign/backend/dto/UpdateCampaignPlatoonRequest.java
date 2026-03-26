package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.PlatoonCondition;

import java.util.List;

public record UpdateCampaignPlatoonRequest(String name,
                                           PlatoonCondition condition,
                                           Integer strength,
                                           Integer mpBase,
                                           List<String> traits,
                                           Boolean entrenched,
                                           Boolean hiddenFromPlayers) {
}
