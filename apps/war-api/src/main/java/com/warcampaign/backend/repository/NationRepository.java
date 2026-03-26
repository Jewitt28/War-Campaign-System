package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Nation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NationRepository extends JpaRepository<Nation, UUID> {

    @EntityGraph(attributePaths = {"faction"})
    List<Nation> findAllByCampaignIdOrderByNameAsc(UUID campaignId);
}
