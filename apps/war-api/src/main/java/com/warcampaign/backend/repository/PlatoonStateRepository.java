package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.PlatoonState;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlatoonStateRepository extends JpaRepository<PlatoonState, UUID> {

    @EntityGraph(attributePaths = {
            "platoon",
            "platoon.faction",
            "platoon.nation",
            "platoon.assignedMember",
            "platoon.assignedMember.user",
            "platoon.homeTerritory",
            "territory"
    })
    @Query("""
            select ps
            from PlatoonState ps
            where ps.platoon.campaign.id = :campaignId
              and ps.turn.campaign.id = :campaignId
              and ps.turn.turnNumber = :turnNumber
            order by ps.platoon.name asc
            """)
    List<PlatoonState> findAllByCampaignIdAndTurnNumber(UUID campaignId, int turnNumber);

    @EntityGraph(attributePaths = {
            "platoon",
            "platoon.faction",
            "platoon.nation",
            "platoon.assignedMember",
            "platoon.assignedMember.user",
            "platoon.homeTerritory",
            "territory"
    })
    @Query("""
            select ps
            from PlatoonState ps
            where ps.platoon.campaign.id = :campaignId
              and ps.turn.campaign.id = :campaignId
              and ps.turn.turnNumber = :turnNumber
              and ps.platoon.id = :platoonId
            """)
    Optional<PlatoonState> findByPlatoonIdAndCampaignIdAndTurnNumber(UUID platoonId, UUID campaignId, int turnNumber);
}
