package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.VisibilityState;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VisibilityStateRepository extends JpaRepository<VisibilityState, UUID> {

    @EntityGraph(attributePaths = {"territory", "territory.theatre", "viewerFaction", "visibleOwnerFaction"})
    List<VisibilityState> findAllByCampaignIdAndViewerFactionIdAndTurnNumberOrderByTerritoryNameAsc(UUID campaignId, UUID viewerFactionId, int turnNumber);

    @EntityGraph(attributePaths = {"territory", "territory.theatre", "viewerFaction", "visibleOwnerFaction"})
    Optional<VisibilityState> findByCampaignIdAndViewerFactionIdAndTerritoryIdAndTurnNumber(UUID campaignId, UUID viewerFactionId, UUID territoryId, int turnNumber);

    boolean existsByCampaignIdAndViewerFactionIdAndTurnNumber(UUID campaignId, UUID viewerFactionId, int turnNumber);

    void deleteAllByCampaignIdAndTurnNumber(UUID campaignId, int turnNumber);
}
