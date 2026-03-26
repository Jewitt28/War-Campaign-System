package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.CampaignAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CampaignAuditLogRepository extends JpaRepository<CampaignAuditLog, UUID> {

    List<CampaignAuditLog> findAllByCampaignIdOrderByCreatedAtAsc(UUID campaignId);
}
