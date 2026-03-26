package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.BattleParticipant;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BattleParticipantRepository extends JpaRepository<BattleParticipant, UUID> {

    @EntityGraph(attributePaths = {"platoon", "platoon.faction", "platoon.nation"})
    List<BattleParticipant> findAllByBattleIdOrderByCreatedAtAsc(UUID battleId);
}
