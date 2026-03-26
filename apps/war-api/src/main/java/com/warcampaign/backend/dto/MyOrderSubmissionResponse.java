package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MyOrderSubmissionResponse(UUID submissionId,
                                        UUID campaignId,
                                        int turnNumber,
                                        UUID submittedByMemberId,
                                        UUID factionId,
                                        OrderSubmissionStatus status,
                                        Instant submittedAt,
                                        Instant lockedAt,
                                        String checksum,
                                        List<PlatoonOrderResponse> orders) {
}
