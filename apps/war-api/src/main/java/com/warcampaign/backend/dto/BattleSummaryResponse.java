package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.BattleMode;
import com.warcampaign.backend.domain.enums.BattleStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BattleSummaryResponse(UUID battleId,
                                    UUID territoryId,
                                    String territoryName,
                                    BattleStatus battleStatus,
                                    BattleMode battleMode,
                                    UUID attackerFactionId,
                                    String attackerFactionName,
                                    UUID defenderFactionId,
                                    String defenderFactionName,
                                    Instant createdAt,
                                    List<BattleParticipantResponse> participants) {
}
