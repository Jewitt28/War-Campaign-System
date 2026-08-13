package com.warcampaign.backend.dto;

import java.util.UUID;

public record FactionInviteInfo(UUID factionId,
                                String factionKey,
                                String factionName,
                                String invitedByDisplayName) {
}
