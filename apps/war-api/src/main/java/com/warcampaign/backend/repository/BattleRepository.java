package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Battle;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BattleRepository extends JpaRepository<Battle, UUID> {

    @EntityGraph(attributePaths = {"territory", "attackerFaction", "defenderFaction"})
    List<Battle> findAllByCampaignIdAndTurnNumberOrderByCreatedAtAsc(UUID campaignId, int turnNumber);

    @EntityGraph(attributePaths = {"campaign", "territory", "attackerFaction", "defenderFaction"})
    Optional<Battle> findByIdAndCampaignId(UUID battleId, UUID campaignId);

    boolean existsByCampaignIdAndTurnNumber(UUID campaignId, int turnNumber);
}
