package com.warcampaign.backend.dto;

import java.util.Map;

public record CampaignNationStateResponse(String nationKey,
                                          int supplies,
                                          int manpower,
                                          int resourcePoints,
                                          Map<String, Integer> economyPool,
                                          Object researchState,
                                          Object doctrineState,
                                          Object upgradesState) {
}
