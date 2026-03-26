package com.warcampaign.backend.dto;

import java.util.Map;

public record SaveCampaignNationStatesRequest(Map<String, SaveCampaignNationStateRequest> nationStates) {
}
