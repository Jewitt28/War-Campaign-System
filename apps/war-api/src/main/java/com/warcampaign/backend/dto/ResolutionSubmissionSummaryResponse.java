package com.warcampaign.backend.dto;

import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;

import java.time.Instant;
import java.util.UUID;

public record ResolutionSubmissionSummaryResponse(UUID submissionId,
                                                  UUID submittedByMemberId,
                                                  String submittedByDisplayName,
                                                  UUID factionId,
                                                  String factionName,
                                                  OrderSubmissionStatus status,
                                                  Instant lockedAt,
                                                  Instant revealAt,
                                                  String checksum,
                                                  int orderCount) {
}
