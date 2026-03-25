package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CampaignMemberRepository extends JpaRepository<CampaignMember, UUID> {

    Optional<CampaignMember> findByCampaignAndUser(Campaign campaign, User user);
}
