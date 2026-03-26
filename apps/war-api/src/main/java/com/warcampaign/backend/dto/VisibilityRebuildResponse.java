package com.warcampaign.backend.dto;

import java.util.UUID;

public record VisibilityRebuildResponse(UUID campaignId,
                                        int turnNumber,
                                        int viewerFactionCount,
                                        int visibilityRowCount) {
}
