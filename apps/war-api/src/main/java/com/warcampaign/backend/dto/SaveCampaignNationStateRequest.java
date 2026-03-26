package com.warcampaign.backend.dto;

import java.util.Map;

public record SaveCampaignNationStateRequest(Integer supplies,
                                             Integer manpower,
                                             Integer resourcePoints,
                                             Map<String, Integer> economyPool,
                                             Object researchState,
                                             Object doctrineState,
                                             Object upgradesState) {
}
