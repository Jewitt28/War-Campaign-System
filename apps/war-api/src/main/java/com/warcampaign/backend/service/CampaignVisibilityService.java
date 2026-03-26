package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.VisibilityLevel;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.TerritoryState;
import com.warcampaign.backend.domain.model.VisibilityState;
import com.warcampaign.backend.dto.VisibilityRebuildResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import com.warcampaign.backend.repository.VisibilityStateRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CampaignVisibilityService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final FactionRepository factionRepository;
    private final TerritoryStateRepository territoryStateRepository;
    private final PlatoonStateRepository platoonStateRepository;
    private final VisibilityStateRepository visibilityStateRepository;

    public CampaignVisibilityService(CampaignMemberRepository campaignMemberRepository,
                                     FactionRepository factionRepository,
                                     TerritoryStateRepository territoryStateRepository,
                                     PlatoonStateRepository platoonStateRepository,
                                     VisibilityStateRepository visibilityStateRepository) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.factionRepository = factionRepository;
        this.territoryStateRepository = territoryStateRepository;
        this.platoonStateRepository = platoonStateRepository;
        this.visibilityStateRepository = visibilityStateRepository;
    }

    @Transactional
    public VisibilityRebuildResponse rebuildVisibility(UUID campaignId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireGmMembership(campaignId, authenticatedUser.id());
        return rebuildVisibility(membership.getCampaign());
    }

    @Transactional
    public VisibilityRebuildResponse rebuildVisibility(Campaign campaign) {
        int turnNumber = campaign.getCurrentTurnNumber();
        List<Faction> factions = factionRepository.findAllByCampaignIdOrderByNameAsc(campaign.getId());
        List<TerritoryState> territoryStates = territoryStateRepository.findAllByCampaignIdAndTurnNumber(campaign.getId(), turnNumber);
        List<PlatoonState> platoonStates = platoonStateRepository.findAllByCampaignIdAndTurnNumber(campaign.getId(), turnNumber);
        Map<UUID, List<PlatoonState>> platoonsByTerritoryId = platoonStates.stream()
                .filter(state -> state.getTerritory() != null)
                .collect(Collectors.groupingBy(state -> state.getTerritory().getId()));

        visibilityStateRepository.deleteAllByCampaignIdAndTurnNumber(campaign.getId(), turnNumber);

        int rowCount = 0;
        for (Faction viewerFaction : factions) {
            for (TerritoryState territoryState : territoryStates) {
                VisibilityState visibilityState = buildVisibilityState(campaign, viewerFaction, territoryState,
                        platoonsByTerritoryId.getOrDefault(territoryState.getTerritory().getId(), List.of()));
                visibilityStateRepository.save(visibilityState);
                rowCount++;
            }
        }

        return new VisibilityRebuildResponse(campaign.getId(), turnNumber, factions.size(), rowCount);
    }

    @Transactional
    public List<VisibilityState> ensureVisibility(Campaign campaign, Faction viewerFaction) {
        if (!visibilityStateRepository.existsByCampaignIdAndViewerFactionIdAndTurnNumber(campaign.getId(), viewerFaction.getId(), campaign.getCurrentTurnNumber())) {
            rebuildVisibility(campaign);
        }
        return visibilityStateRepository.findAllByCampaignIdAndViewerFactionIdAndTurnNumberOrderByTerritoryNameAsc(
                campaign.getId(), viewerFaction.getId(), campaign.getCurrentTurnNumber());
    }

    @Transactional
    public VisibilityState ensureVisibilityForTerritory(Campaign campaign, Faction viewerFaction, UUID territoryId) {
        ensureVisibility(campaign, viewerFaction);
        return visibilityStateRepository.findByCampaignIdAndViewerFactionIdAndTerritoryIdAndTurnNumber(
                        campaign.getId(), viewerFaction.getId(), territoryId, campaign.getCurrentTurnNumber())
                .orElseThrow(() -> new ApiException("TERRITORY_NOT_FOUND", HttpStatus.NOT_FOUND, "Territory not found"));
    }

    private CampaignMember requireGmMembership(UUID campaignId, UUID userId) {
        CampaignMember membership = campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
        if (membership.getRole() != CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required for visibility rebuild");
        }
        return membership;
    }

    private VisibilityState buildVisibilityState(Campaign campaign,
                                                 Faction viewerFaction,
                                                 TerritoryState territoryState,
                                                 List<PlatoonState> platoonStates) {
        VisibilityState visibilityState = new VisibilityState();
        visibilityState.setCampaign(campaign);
        visibilityState.setTerritory(territoryState.getTerritory());
        visibilityState.setViewerFaction(viewerFaction);
        visibilityState.setTurnNumber(campaign.getCurrentTurnNumber());
        visibilityState.setUpdatedAt(Instant.now());

        VisibilityLevel level = determineVisibilityLevel(campaign, viewerFaction, territoryState, platoonStates);
        visibilityState.setVisibilityLevel(level);
        visibilityState.setSourceType(level == VisibilityLevel.UNKNOWN ? "NONE" : "CURRENT_STATE");
        visibilityState.setConfidenceScore(level == VisibilityLevel.UNKNOWN ? 0 : 100);

        if (level == VisibilityLevel.UNKNOWN) {
            visibilityState.setVisibleOwnerFaction(null);
            visibilityState.setVisibleFortLevel(null);
            visibilityState.setVisibleForcesSummary(null);
            return visibilityState;
        }

        visibilityState.setVisibleOwnerFaction(territoryState.getControllingFaction());
        visibilityState.setVisibleFortLevel(level == VisibilityLevel.OBSERVED || level == VisibilityLevel.OWNED || level == VisibilityLevel.FULL
                ? territoryState.getFortLevel()
                : null);
        visibilityState.setVisibleForcesSummary(buildVisibleForceSummary(viewerFaction, platoonStates));
        return visibilityState;
    }

    private VisibilityLevel determineVisibilityLevel(Campaign campaign,
                                                     Faction viewerFaction,
                                                     TerritoryState territoryState,
                                                     List<PlatoonState> platoonStates) {
        if (!campaign.isFogOfWarEnabled()) {
            return VisibilityLevel.FULL;
        }
        if (territoryState.getControllingFaction() != null
                && territoryState.getControllingFaction().getId().equals(viewerFaction.getId())) {
            return VisibilityLevel.OWNED;
        }
        boolean hasViewerPlatoonPresent = platoonStates.stream()
                .map(PlatoonState::getPlatoon)
                .anyMatch(platoon -> platoon.getFaction().getId().equals(viewerFaction.getId()));
        if (hasViewerPlatoonPresent) {
            return VisibilityLevel.OBSERVED;
        }
        return VisibilityLevel.UNKNOWN;
    }

    private String buildVisibleForceSummary(Faction viewerFaction, List<PlatoonState> platoonStates) {
        long friendlyCount = platoonStates.stream()
                .filter(state -> state.getPlatoon().getFaction().getId().equals(viewerFaction.getId()))
                .count();
        if (friendlyCount > 0) {
            return "Friendly presence: %d platoon(s)".formatted(friendlyCount);
        }
        return platoonStates.isEmpty() ? null : "Enemy activity observed";
    }
}
