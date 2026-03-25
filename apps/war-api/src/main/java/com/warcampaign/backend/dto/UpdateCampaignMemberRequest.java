package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.CampaignRole;

import java.util.UUID;

public record UpdateCampaignMemberRequest(CampaignRole role,
                                          UUID factionId,
                                          UUID nationId) {

    public boolean hasChanges() {
        return role != null || factionId != null || nationId != null;
    }
}
