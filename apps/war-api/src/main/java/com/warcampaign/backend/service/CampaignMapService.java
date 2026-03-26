package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.model.*;
import com.warcampaign.backend.dto.*;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.*;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@SuppressWarnings("unused")
@Service
public class CampaignMapService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final TheatreRepository theatreRepository;
    private final FactionRepository factionRepository;
    private final NationRepository nationRepository;
    private final TerritoryRepository territoryRepository;
    private final TerritoryStateRepository territoryStateRepository;
    private final TurnRepository turnRepository;

    public CampaignMapService(CampaignMemberRepository campaignMemberRepository,
                              TheatreRepository theatreRepository,
                              FactionRepository factionRepository,
                              NationRepository nationRepository,
                              TerritoryRepository territoryRepository,
                              TerritoryStateRepository territoryStateRepository,
                              TurnRepository turnRepository) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.theatreRepository = theatreRepository;
        this.factionRepository = factionRepository;
        this.nationRepository = nationRepository;
        this.territoryRepository = territoryRepository;
        this.territoryStateRepository = territoryStateRepository;
        this.turnRepository = turnRepository;
    }

    @Transactional(readOnly = true)
    public CampaignMapResponse getMap(UUID campaignId, AuthenticatedUser authenticatedUser) {
        Campaign campaign = requireMembership(campaignId, authenticatedUser.id()).getCampaign();
        Turn currentTurn = requireCurrentTurn(campaign);

        List<Theatre> theatres = theatreRepository.findAllByCampaignIdOrderByDisplayOrderAscNameAsc(campaignId);
        List<Faction> factions = factionRepository.findAllByCampaignIdOrderByNameAsc(campaignId);
        List<Nation> nations = nationRepository.findAllByCampaignIdOrderByNameAsc(campaignId);
        List<TerritoryState> states = territoryStateRepository.findAllByCampaignIdAndTurnNumber(campaignId, currentTurn.getTurnNumber());

        return new CampaignMapResponse(
                campaign.getId(),
                campaign.getName(),
                campaign.getCurrentTurnNumber(),
                campaign.getCurrentPhase(),
                campaign.getPhaseStartedAt(),
                campaign.getPhaseEndsAt(),
                campaign.isFogOfWarEnabled(),
                campaign.isTimersEnabled(),
                theatres.stream().map(this::toTheatreResponse).toList(),
                factions.stream().map(this::toCampaignFactionResponse).toList(),
                nations.stream().map(this::toNationResponse).toList(),
                states.stream()
                        .sorted(Comparator.comparing(state -> state.getTerritory().getName()))
                        .map(this::toTerritorySummaryResponse)
                        .toList()
        );
    }

    @Transactional(readOnly = true)
    public PlayerTerritoryResponse getPlayerTerritory(UUID campaignId, UUID territoryId, AuthenticatedUser authenticatedUser) {
        Campaign campaign = requireMembership(campaignId, authenticatedUser.id()).getCampaign();
        TerritoryState state = requireTerritoryState(campaign, territoryId);
        return toPlayerTerritoryResponse(state);
    }

    @Transactional(readOnly = true)
    public GmTerritoryResponse getGmTerritory(UUID campaignId, UUID territoryId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        if (membership.getRole() != CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required for GM territory access");
        }
        TerritoryState state = requireTerritoryState(membership.getCampaign(), territoryId);
        return toGmTerritoryResponse(state);
    }

    private CampaignMember requireMembership(UUID campaignId, UUID userId) {
        return campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    private Turn requireCurrentTurn(Campaign campaign) {
        return turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), campaign.getCurrentTurnNumber())
                .orElseThrow(() -> new ApiException("CAMPAIGN_TURN_NOT_FOUND", HttpStatus.NOT_FOUND, "Current campaign turn not found"));
    }

    private TerritoryState requireTerritoryState(Campaign campaign, UUID territoryId) {
        if (territoryRepository.findByIdAndCampaignId(territoryId, campaign.getId()).isEmpty()) {
            throw new ApiException("TERRITORY_NOT_FOUND", HttpStatus.NOT_FOUND, "Territory not found");
        }
        return territoryStateRepository.findByTerritoryIdAndCampaignIdAndTurnNumber(territoryId, campaign.getId(), campaign.getCurrentTurnNumber())
                .orElseThrow(() -> new ApiException("TERRITORY_STATE_NOT_FOUND", HttpStatus.NOT_FOUND, "Current territory state not found"));
    }

    private CampaignFactionResponse toCampaignFactionResponse(Faction faction) {
        return new CampaignFactionResponse(
                faction.getId(),
                faction.getFactionKey(),
                faction.getName(),
                faction.getType().name(),
                faction.getColor(),
                faction.isPlayerControlled()
        );
    }

    private MapTheatreResponse toTheatreResponse(Theatre theatre) {
        return new MapTheatreResponse(theatre.getId(), theatre.getTheatreKey(), theatre.getName(), theatre.getDisplayOrder(), theatre.isActive());
    }

    private MapNationResponse toNationResponse(Nation nation) {
        return new MapNationResponse(
                nation.getId(),
                nation.getFaction() != null ? nation.getFaction().getId() : null,
                nation.getNationKey(),
                nation.getName(),
                nation.isNpc()
        );
    }

    private MapTerritorySummaryResponse toTerritorySummaryResponse(TerritoryState state) {
        return new MapTerritorySummaryResponse(
                state.getTerritory().getId(),
                state.getTerritory().getTerritoryKey(),
                state.getTerritory().getName(),
                state.getTerritory().getTheatre().getId(),
                state.getStrategicStatus(),
                state.getControllingFaction() != null ? state.getControllingFaction().getId() : null,
                state.getControllerNation() != null ? state.getControllerNation().getId() : null,
                state.getFortLevel(),
                state.getSupplyStatus()
        );
    }

    private PlayerTerritoryResponse toPlayerTerritoryResponse(TerritoryState state) {
        Territory territory = state.getTerritory();
        return new PlayerTerritoryResponse(
                territory.getId(),
                territory.getTerritoryKey(),
                territory.getName(),
                toTheatreResponse(territory.getTheatre()),
                territory.getTerrainType(),
                territory.getStrategicTagsJson(),
                territory.getBaseIndustry(),
                territory.getBaseManpower(),
                territory.isHasPort(),
                territory.isHasAirfield(),
                territory.getMaxFortLevel(),
                state.getStrategicStatus(),
                state.getFortLevel(),
                state.getSupplyStatus(),
                toFactionReference(state.getControllingFaction()),
                toNationReference(state.getControllerNation())
        );
    }

    private GmTerritoryResponse toGmTerritoryResponse(TerritoryState state) {
        Territory territory = state.getTerritory();
        return new GmTerritoryResponse(
                territory.getId(),
                territory.getTerritoryKey(),
                territory.getName(),
                toTheatreResponse(territory.getTheatre()),
                territory.getTerrainType(),
                territory.getStrategicTagsJson(),
                territory.getBaseIndustry(),
                territory.getBaseManpower(),
                territory.isHasPort(),
                territory.isHasAirfield(),
                territory.getMaxFortLevel(),
                state.getStrategicStatus(),
                state.getFortLevel(),
                state.getPartisanRisk(),
                state.getSupplyStatus(),
                state.getDamageJson(),
                state.getNotes(),
                territory.getMetadataJson(),
                toFactionReference(state.getControllingFaction()),
                toNationReference(state.getControllerNation())
        );
    }

    private MapFactionReferenceResponse toFactionReference(Faction faction) {
        if (faction == null) {
            return null;
        }
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
}
