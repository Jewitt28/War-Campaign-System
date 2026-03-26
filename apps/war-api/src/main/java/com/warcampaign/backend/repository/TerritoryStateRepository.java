package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.TerritoryState;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TerritoryStateRepository extends JpaRepository<TerritoryState, UUID> {

    @EntityGraph(attributePaths = {"territory", "territory.theatre", "controllingFaction", "controllerNation", "controllerNation.faction"})
    @Query("""
            select ts from TerritoryState ts
            where ts.territory.campaign.id = :campaignId
              and ts.turn.turnNumber = :turnNumber
            """)
    List<TerritoryState> findAllByCampaignIdAndTurnNumber(UUID campaignId, int turnNumber);

    @EntityGraph(attributePaths = {"territory", "territory.theatre", "controllingFaction", "controllerNation", "controllerNation.faction"})
    @Query("""
            select ts from TerritoryState ts
            where ts.territory.id = :territoryId
              and ts.territory.campaign.id = :campaignId
              and ts.turn.turnNumber = :turnNumber
            """)
    Optional<TerritoryState> findByTerritoryIdAndCampaignIdAndTurnNumber(UUID territoryId, UUID campaignId, int turnNumber);
}
