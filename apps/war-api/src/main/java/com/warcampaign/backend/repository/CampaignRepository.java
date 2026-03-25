package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CampaignRepository extends JpaRepository<Campaign, UUID> {
}
