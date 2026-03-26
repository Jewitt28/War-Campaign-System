package com.warcampaign.backend.dto;

import java.util.UUID;

public record MapTheatreResponse(UUID id,
                                 String key,
                                 String name,
                                 int displayOrder,
                                 boolean active) {
}
