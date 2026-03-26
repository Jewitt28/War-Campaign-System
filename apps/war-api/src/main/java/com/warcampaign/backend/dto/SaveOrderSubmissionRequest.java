package com.warcampaign.backend.dto;

import java.util.List;

public record SaveOrderSubmissionRequest(List<OrderLineRequest> orders) {
}
