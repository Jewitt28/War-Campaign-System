package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Nation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NationRepository extends JpaRepository<Nation, UUID> {

    @EntityGraph(attributePaths = {"faction"})
    List<Nation> findAllByCampaignIdOrderByNameAsc(UUID campaignId);

    @EntityGraph(attributePaths = {"faction"})
    Optional<Nation> findByCampaignIdAndNationKey(UUID campaignId, String nationKey);

    @EntityGraph(attributePaths = {"faction"})
    Optional<Nation> findByIdAndCampaignId(UUID nationId, UUID campaignId);
}
