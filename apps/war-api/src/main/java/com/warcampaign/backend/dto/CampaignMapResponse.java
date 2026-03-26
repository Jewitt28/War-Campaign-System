package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignPhase;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CampaignMapResponse(UUID campaignId,
                                  String campaignName,
                                  int currentTurnNumber,
                                  CampaignPhase currentPhase,
                                  Instant phaseStartedAt,
                                  Instant phaseEndsAt,
                                  boolean fogOfWarEnabled,
                                  boolean timersEnabled,
                                  List<MapTheatreResponse> theatres,
                                  List<CampaignFactionResponse> factions,
                                  List<MapNationResponse> nations,
                                  List<MapTerritorySummaryResponse> territories) {
}
