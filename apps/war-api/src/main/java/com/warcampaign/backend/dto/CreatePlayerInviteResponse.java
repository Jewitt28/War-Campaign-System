package com.warcampaign.backend.dto;

import java.util.UUID;

public record CreatePlayerInviteResponse(UUID inviteId,
                                         String token,
                                         String url,
                                         String factionName) {
}
