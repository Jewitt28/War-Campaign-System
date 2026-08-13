package com.warcampaign.backend.dto;

public record SpSetupNationChoice(
        String nationKey,
        String assignment,
        String cpuStrategy,
        String homelandTerritoryKey
) {
    // assignment: "HUMAN" | "CPU" | "INACTIVE"
    // cpuStrategy: "AGGRESSIVE" | "DEFENSIVE" | "BALANCED" (only relevant when assignment=CPU)
    // homelandTerritoryKey: optional; if null the backend falls back to auto-resolution
}
