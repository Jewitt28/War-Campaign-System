package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Faction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FactionRepository extends JpaRepository<Faction, UUID> {

    List<Faction> findAllByCampaignIdOrderByNameAsc(UUID campaignId);

    Optional<Faction> findByIdAndCampaignId(UUID factionId, UUID campaignId);
}
