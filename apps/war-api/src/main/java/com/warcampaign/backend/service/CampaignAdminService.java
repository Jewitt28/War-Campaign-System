package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignAuditLog;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.dto.BattleSummaryResponse;
import com.warcampaign.backend.dto.CampaignAuditLogResponse;
import com.warcampaign.backend.dto.CampaignMemberResponse;
import com.warcampaign.backend.dto.CampaignSnapshotExportResponse;
import com.warcampaign.backend.dto.MapTerritorySummaryResponse;
import com.warcampaign.backend.dto.PlayerPlatoonSummaryResponse;
import com.warcampaign.backend.dto.ResolutionEventResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignAuditLogRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class CampaignAdminService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final CampaignAuditLogRepository campaignAuditLogRepository;
    private final CampaignLobbyService campaignLobbyService;
    private final CampaignMapService campaignMapService;
    private final CampaignPlatoonService campaignPlatoonService;
    private final CampaignResolutionService campaignResolutionService;

    public CampaignAdminService(CampaignMemberRepository campaignMemberRepository,
                                CampaignAuditLogRepository campaignAuditLogRepository,
                                CampaignLobbyService campaignLobbyService,
                                CampaignMapService campaignMapService,
                                CampaignPlatoonService campaignPlatoonService,
                                CampaignResolutionService campaignResolutionService) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.campaignAuditLogRepository = campaignAuditLogRepository;
        this.campaignLobbyService = campaignLobbyService;
        this.campaignMapService = campaignMapService;
        this.campaignPlatoonService = campaignPlatoonService;
        this.campaignResolutionService = campaignResolutionService;
    }

    @Transactional(readOnly = true)
    public List<CampaignAuditLogResponse> getAuditLog(UUID campaignId, AuthenticatedUser authenticatedUser) {
        requireGmMembership(campaignId, authenticatedUser.id());
        return campaignAuditLogRepository.findAllByCampaignIdOrderByCreatedAtAsc(campaignId).stream()
                .map(this::toAuditLogResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CampaignSnapshotExportResponse exportSnapshot(UUID campaignId, AuthenticatedUser authenticatedUser) {
        Campaign campaign = requireGmMembership(campaignId, authenticatedUser.id()).getCampaign();
        List<CampaignMemberResponse> members = campaignLobbyService.listMembers(campaignId, authenticatedUser);
        List<MapTerritorySummaryResponse> territories = campaignMapService.getMap(campaignId, authenticatedUser).territories();
        List<PlayerPlatoonSummaryResponse> platoons = campaignPlatoonService.listPlatoons(campaignId, authenticatedUser);
        List<BattleSummaryResponse> battles = campaignResolutionService.getResolutionSummary(campaignId, campaign.getCurrentTurnNumber(), authenticatedUser).battles();
        List<ResolutionEventResponse> resolutionEvents = campaignResolutionService.getResolutionSummary(
                campaignId, campaign.getCurrentTurnNumber(), authenticatedUser).events();

        return new CampaignSnapshotExportResponse(
                campaign.getId(),
                campaign.getName(),
                campaign.getCampaignStatus(),
                campaign.getCurrentTurnNumber(),
                campaign.getCurrentPhase(),
                Instant.now(),
                members,
                territories,
                platoons,
                battles,
                resolutionEvents,
                getAuditLog(campaignId, authenticatedUser)
        );
    }

    private CampaignMember requireGmMembership(UUID campaignId, UUID userId) {
        CampaignMember membership = campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
        if (membership.getRole() != CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required for admin tools");
        }
        return membership;
    }

    private CampaignAuditLogResponse toAuditLogResponse(CampaignAuditLog auditLog) {
        return new CampaignAuditLogResponse(
                auditLog.getId(),
                auditLog.getActorType(),
                auditLog.getActorUser() != null ? auditLog.getActorUser().getId() : null,
                auditLog.getActorUser() != null ? auditLog.getActorUser().getDisplayName() : null,
                auditLog.getActorMember() != null ? auditLog.getActorMember().getId() : null,
                auditLog.getActionType(),
                auditLog.getEntityType(),
                auditLog.getEntityId(),
                auditLog.getBeforeJson(),
                auditLog.getAfterJson(),
                auditLog.getCreatedAt()
        );
    }
}
