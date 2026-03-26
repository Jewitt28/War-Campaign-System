package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.dto.GmPlatoonDetailResponse;
import com.warcampaign.backend.dto.MapFactionReferenceResponse;
import com.warcampaign.backend.dto.MapNationReferenceResponse;
import com.warcampaign.backend.dto.PlayerPlatoonDetailResponse;
import com.warcampaign.backend.dto.PlayerPlatoonSummaryResponse;
import com.warcampaign.backend.dto.PlatoonMemberReferenceResponse;
import com.warcampaign.backend.dto.PlatoonTerritoryReferenceResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CampaignPlatoonService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final PlatoonStateRepository platoonStateRepository;
    private final TurnRepository turnRepository;

    public CampaignPlatoonService(CampaignMemberRepository campaignMemberRepository,
                                  PlatoonStateRepository platoonStateRepository,
                                  TurnRepository turnRepository) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.platoonStateRepository = platoonStateRepository;
        this.turnRepository = turnRepository;
    }

    @Transactional(readOnly = true)
    public List<PlayerPlatoonSummaryResponse> listPlatoons(UUID campaignId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        Turn currentTurn = requireCurrentTurn(membership.getCampaign());

        if (membership.getRole() == CampaignRole.OBSERVER) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "Observer role cannot access platoon reads");
        }

        return platoonStateRepository.findAllByCampaignIdAndTurnNumber(campaignId, currentTurn.getTurnNumber()).stream()
                .filter(state -> canViewPlatoon(state.getPlatoon(), membership))
                .map(this::toPlayerSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public Object getPlatoon(UUID campaignId, UUID platoonId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        Turn currentTurn = requireCurrentTurn(membership.getCampaign());

        if (membership.getRole() == CampaignRole.OBSERVER) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "Observer role cannot access platoon reads");
        }

        PlatoonState state = platoonStateRepository.findByPlatoonIdAndCampaignIdAndTurnNumber(platoonId, campaignId, currentTurn.getTurnNumber())
                .orElseThrow(() -> new ApiException("PLATOON_NOT_FOUND", HttpStatus.NOT_FOUND, "Platoon not found"));

        if (membership.getRole() == CampaignRole.GM) {
            return toGmDetail(state);
        }

        if (!canViewPlatoon(state.getPlatoon(), membership)) {
            throw new ApiException("PLATOON_NOT_FOUND", HttpStatus.NOT_FOUND, "Platoon not found");
        }

        return toPlayerDetail(state);
    }

    private CampaignMember requireMembership(UUID campaignId, UUID userId) {
        return campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    private Turn requireCurrentTurn(Campaign campaign) {
        return turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), campaign.getCurrentTurnNumber())
                .orElseThrow(() -> new ApiException("CAMPAIGN_TURN_NOT_FOUND", HttpStatus.NOT_FOUND, "Current campaign turn not found"));
    }

    private boolean canViewPlatoon(Platoon platoon, CampaignMember membership) {
        if (membership.getRole() == CampaignRole.GM) {
            return true;
        }
        if (membership.getRole() != CampaignRole.PLAYER) {
            return false;
        }
        if (membership.getFaction() == null) {
            return false;
        }
        if (platoon.isHiddenFromPlayers()) {
            return false;
        }
        if (!platoon.getFaction().getId().equals(membership.getFaction().getId())) {
            return false;
        }
        return membership.getNation() == null
                || platoon.getNation() == null
                || platoon.getNation().getId().equals(membership.getNation().getId());
    }

    private PlayerPlatoonSummaryResponse toPlayerSummary(PlatoonState state) {
        return new PlayerPlatoonSummaryResponse(
                state.getPlatoon().getId(),
                state.getPlatoon().getPlatoonKey(),
                state.getPlatoon().getName(),
                state.getPlatoon().getUnitType(),
                toFactionReference(state.getPlatoon().getFaction()),
                toNationReference(state.getPlatoon().getNation()),
                toTerritoryReference(state.getTerritory()),
                state.getReadinessStatus(),
                state.getStrength()
        );
    }

    private PlayerPlatoonDetailResponse toPlayerDetail(PlatoonState state) {
        return new PlayerPlatoonDetailResponse(
                state.getPlatoon().getId(),
                state.getPlatoon().getPlatoonKey(),
                state.getPlatoon().getName(),
                state.getPlatoon().getUnitType(),
                toFactionReference(state.getPlatoon().getFaction()),
                toNationReference(state.getPlatoon().getNation()),
                toTerritoryReference(state.getPlatoon().getHomeTerritory()),
                toTerritoryReference(state.getTerritory()),
                state.getReadinessStatus(),
                state.getStrength()
        );
    }

    private GmPlatoonDetailResponse toGmDetail(PlatoonState state) {
        return new GmPlatoonDetailResponse(
                state.getPlatoon().getId(),
                state.getPlatoon().getPlatoonKey(),
                state.getPlatoon().getName(),
                state.getPlatoon().getUnitType(),
                state.getPlatoon().isHiddenFromPlayers(),
                toFactionReference(state.getPlatoon().getFaction()),
                toNationReference(state.getPlatoon().getNation()),
                toMemberReference(state.getPlatoon().getAssignedMember()),
                toTerritoryReference(state.getPlatoon().getHomeTerritory()),
                toTerritoryReference(state.getTerritory()),
                state.getReadinessStatus(),
                state.getStrength(),
                state.getNotes()
        );
    }

    private MapFactionReferenceResponse toFactionReference(Faction faction) {
        return new MapFactionReferenceResponse(faction.getId(), faction.getFactionKey(), faction.getName());
    }

    private MapNationReferenceResponse toNationReference(Nation nation) {
        if (nation == null) {
            return null;
        }
        return new MapNationReferenceResponse(
                nation.getId(),
                nation.getFaction() != null ? nation.getFaction().getId() : null,
                nation.getNationKey(),
                nation.getName()
        );
    }

    private PlatoonTerritoryReferenceResponse toTerritoryReference(Territory territory) {
        if (territory == null) {
            return null;
        }
        return new PlatoonTerritoryReferenceResponse(territory.getId(), territory.getTerritoryKey(), territory.getName());
    }

    private PlatoonMemberReferenceResponse toMemberReference(CampaignMember member) {
        if (member == null) {
            return null;
        }
        return new PlatoonMemberReferenceResponse(
                member.getId(),
                member.getUser().getId(),
                member.getUser().getDisplayName(),
                member.getUser().getEmail()
        );
    }
}
