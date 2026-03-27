package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignRole;

public record CreateCampaignInviteRequest(String inviteeEmail,
                                          CampaignRole intendedRole,
                                          Integer expiresInDays) {
}
