package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.CampaignAuditLog;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CampaignAuditLogRepository extends JpaRepository<CampaignAuditLog, UUID> {

    @EntityGraph(attributePaths = {"actorUser", "actorMember", "actorMember.user"})
    List<CampaignAuditLog> findAllByCampaignIdOrderByCreatedAtAsc(UUID campaignId);
}
