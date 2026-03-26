package com.warcampaign.backend.dto;

import java.util.UUID;

public record PlatoonMemberReferenceResponse(UUID id, UUID userId, String displayName, String email) {
}
