package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;

import java.util.UUID;

public record CampaignSummaryResponse(UUID id,
                                      String name,
                                      CampaignPhase currentPhase,
                                      CampaignRole myRole,
                                      long memberCount) {
}
