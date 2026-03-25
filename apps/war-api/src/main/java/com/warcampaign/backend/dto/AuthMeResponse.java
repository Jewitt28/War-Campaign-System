package com.warcampaign.backend.dto;

import java.util.UUID;

public record AuthMeResponse(UUID userId, String email, String displayName) {
}
