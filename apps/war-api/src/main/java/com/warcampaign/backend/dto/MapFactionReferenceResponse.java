package com.warcampaign.backend.dto;

import java.util.UUID;

public record MapFactionReferenceResponse(UUID id,
                                          String key,
                                          String name) {
}
