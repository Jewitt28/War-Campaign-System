package com.warcampaign.backend.dto;

public record CampaignBridgeCustomNationRequest(String key,
                                                String name,
                                                String defaultFactionKey,
                                                String color) {
}
