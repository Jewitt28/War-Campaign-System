package com.warcampaign.backend.dto;

import java.util.UUID;

public record BattleParticipantResultRequest(UUID platoonId,
                                             String postConditionBand) {
}
