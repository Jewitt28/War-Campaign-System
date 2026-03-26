package com.warcampaign.backend.dto;

import java.util.List;
import java.util.Map;

public record SaveCampaignMapSetupRequest(boolean useDefaultFactions,
                                          Map<String, Boolean> activeTheatres,
                                          Map<String, Boolean> nationsEnabled,
                                          List<CampaignBridgeCustomFactionRequest> customFactions,
                                          List<CampaignBridgeCustomNationRequest> customNations,
                                          Map<String, String> homelandsByNation) {
}
