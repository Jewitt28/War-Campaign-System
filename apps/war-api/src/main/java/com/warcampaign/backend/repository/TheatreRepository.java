package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Theatre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TheatreRepository extends JpaRepository<Theatre, UUID> {

    List<Theatre> findAllByCampaignIdOrderByDisplayOrderAscNameAsc(UUID campaignId);

    java.util.Optional<Theatre> findByCampaignIdAndTheatreKey(UUID campaignId, String theatreKey);
}
