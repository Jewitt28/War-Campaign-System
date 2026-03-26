package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Platoon;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PlatoonRepository extends JpaRepository<Platoon, UUID> {

    @EntityGraph(attributePaths = {"faction", "nation", "assignedMember", "assignedMember.user", "homeTerritory"})
    Optional<Platoon> findByIdAndCampaignId(UUID id, UUID campaignId);

    @EntityGraph(attributePaths = {"faction", "nation", "assignedMember", "assignedMember.user", "homeTerritory"})
    Optional<Platoon> findByCampaignIdAndPlatoonKey(UUID campaignId, String platoonKey);
}
