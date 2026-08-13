package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Platoon;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PlatoonRepository extends JpaRepository<Platoon, UUID> {

    @EntityGraph(attributePaths = {"faction", "nation", "assignedMember", "assignedMember.user", "homeTerritory"})
    Optional<Platoon> findByIdAndCampaignId(UUID id, UUID campaignId);

    @EntityGraph(attributePaths = {"faction", "nation", "assignedMember", "assignedMember.user", "homeTerritory"})
    Optional<Platoon> findByCampaignIdAndPlatoonKey(UUID campaignId, String platoonKey);

    @EntityGraph(attributePaths = {"faction", "nation"})
    @Query("select p from Platoon p where p.campaign.id = :campaignId and p.nation.id = :nationId")
    List<Platoon> findAllByCampaignIdAndNationId(UUID campaignId, UUID nationId);
}
