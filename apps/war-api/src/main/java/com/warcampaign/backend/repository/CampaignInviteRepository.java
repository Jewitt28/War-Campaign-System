package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.CampaignInvite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CampaignInviteRepository extends JpaRepository<CampaignInvite, UUID> {

    Optional<CampaignInvite> findByInviteToken(String inviteToken);
}
