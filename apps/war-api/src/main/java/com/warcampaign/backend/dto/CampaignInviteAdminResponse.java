package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.InviteStatus;

import java.time.Instant;
import java.util.UUID;

public record CampaignInviteAdminResponse(UUID inviteId,
                                          UUID campaignId,
                                          String inviteeEmail,
                                          String inviteToken,
                                          CampaignRole intendedRole,
                                          InviteStatus status,
                                          Instant expiresAt) {
}
