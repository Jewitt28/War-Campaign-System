package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.CampaignMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CampaignMemberRepository extends JpaRepository<CampaignMember, UUID> {
}
