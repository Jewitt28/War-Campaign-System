package com.warcampaign.backend.dto;

import java.util.List;

public record SpSetupDataResponse(
        List<SpNationSummaryResponse> nations,
        List<TerritoryOptionDto> territories
) {
    public record TerritoryOptionDto(String key, String name, String theatreKey, String theatreName) {}
}
