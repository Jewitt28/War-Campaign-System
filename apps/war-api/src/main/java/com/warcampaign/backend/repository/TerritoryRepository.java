package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Territory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TerritoryRepository extends JpaRepository<Territory, UUID> {

    @EntityGraph(attributePaths = {"theatre"})
    List<Territory> findAllByCampaignIdOrderByNameAsc(UUID campaignId);

    @EntityGraph(attributePaths = {"theatre"})
    Optional<Territory> findByIdAndCampaignId(UUID territoryId, UUID campaignId);
}
