package com.warcampaign.backend.dto;

import java.util.UUID;

public record SpSetupResponse(UUID campaignId, String humanNationKey, int cpuNationCount, String redirectPath) {
}
