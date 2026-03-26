package com.warcampaign.backend.dto;

import java.util.UUID;

public record CampaignFactionResponse(UUID id,
                                      String key,
                                      String name,
                                      String type,
                                      String color,
                                      boolean playerControlled) {
}
