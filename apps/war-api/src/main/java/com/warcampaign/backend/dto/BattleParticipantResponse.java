package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.BattleParticipantSide;

import java.util.UUID;

public record BattleParticipantResponse(UUID platoonId,
                                        String platoonKey,
                                        String platoonName,
                                        BattleParticipantSide side,
                                        String factionName,
                                        String nationName,
                                        String preConditionBand,
                                        String postConditionBand) {
}
