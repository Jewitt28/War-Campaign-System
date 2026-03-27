package com.warcampaign.backend.dto;

import java.util.UUID;

public record OnboardingHomelandOptionResponse(UUID id,
                                               String key,
                                               String name,
                                               UUID theatreId,
                                               String theatreKey,
                                               String theatreName) {
}
