package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.CampaignInvite;
import com.warcampaign.backend.domain.enums.InviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampaignInviteRepository extends JpaRepository<CampaignInvite, UUID> {

    Optional<CampaignInvite> findByInviteToken(String inviteToken);

    List<CampaignInvite> findAllByStatusAndExpiresAtBetween(InviteStatus status, Instant start, Instant end);

    List<CampaignInvite> findAllByStatusAndExpiresAtBefore(InviteStatus status, Instant threshold);
}
