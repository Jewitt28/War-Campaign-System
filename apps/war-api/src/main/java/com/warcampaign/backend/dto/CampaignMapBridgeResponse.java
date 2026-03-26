package com.warcampaign.backend.dto;

import java.util.List;
import java.util.Map;

public record CampaignMapBridgeResponse(boolean useDefaultFactions,
                                        Map<String, Boolean> activeTheatres,
                                        Map<String, Boolean> nationsEnabled,
                                        List<CampaignBridgeCustomFactionResponse> customFactions,
                                        List<CampaignBridgeCustomNationResponse> customNations,
                                        Map<String, String> homelandsByNation,
                                        Map<String, CampaignNationStateResponse> nationStates) {
}
