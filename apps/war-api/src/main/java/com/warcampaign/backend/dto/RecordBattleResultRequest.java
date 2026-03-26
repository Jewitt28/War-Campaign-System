package com.warcampaign.backend.dto;

import java.util.List;
import java.util.UUID;

public record RecordBattleResultRequest(String tabletopResultSummary,
                                        UUID winnerFactionId,
                                        List<BattleParticipantResultRequest> participantResults) {
}
