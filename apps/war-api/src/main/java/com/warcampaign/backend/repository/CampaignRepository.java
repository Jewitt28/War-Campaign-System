package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CampaignRepository extends JpaRepository<Campaign, UUID> {

    @Query("""
            select c
            from Campaign c
            where c.timersEnabled = true
              and c.phaseEndsAt is not null
              and c.phaseEndsAt <= :threshold
            """)
    List<Campaign> findAllWithExpiredPhase(Instant threshold);

    @Query("""
            select c
            from Campaign c
            where c.timersEnabled = true
              and c.phaseEndsAt is not null
              and c.phaseEndsAt > :start
              and c.phaseEndsAt <= :end
            """)
    List<Campaign> findAllWithPhaseEndingBetween(Instant start, Instant end);

    List<Campaign> findAllByFogOfWarEnabledTrueAndCampaignStatusIn(Collection<CampaignStatus> statuses);

    List<Campaign> findAllByCampaignStatusIn(Collection<CampaignStatus> statuses);
}
