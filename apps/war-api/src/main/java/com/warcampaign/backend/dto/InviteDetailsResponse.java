package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.InviteStatus;

import java.time.Instant;
import java.util.UUID;

public record InviteDetailsResponse(UUID campaignId,
                                    String campaignName,
                                    CampaignRole intendedRole,
                                    InviteStatus status,
                                    Instant expiresAt,
                                    boolean expired,
                                    String intendedFactionKey,
                                    String intendedNationKey) {
}
