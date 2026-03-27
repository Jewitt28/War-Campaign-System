package com.warcampaign.backend.dto;

import java.util.UUID;

public record SelectOnboardingNationRequest(UUID nationId,
                                            String customNationName,
                                            String customNationColor) {
}
