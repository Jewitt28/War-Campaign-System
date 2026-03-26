package com.warcampaign.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.PlatoonCondition;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.dto.CreateCampaignPlatoonRequest;
import com.warcampaign.backend.dto.GmPlatoonDetailResponse;
import com.warcampaign.backend.dto.MapFactionReferenceResponse;
import com.warcampaign.backend.dto.MapNationReferenceResponse;
import com.warcampaign.backend.dto.PlayerPlatoonDetailResponse;
import com.warcampaign.backend.dto.PlayerPlatoonSummaryResponse;
import com.warcampaign.backend.dto.PlatoonDetailResponse;
import com.warcampaign.backend.dto.PlatoonMemberReferenceResponse;
import com.warcampaign.backend.dto.PlatoonTerritoryReferenceResponse;
import com.warcampaign.backend.dto.UpdateCampaignPlatoonRequest;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
import com.warcampaign.backend.repository.PlatoonRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TerritoryRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class CampaignPlatoonService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final PlatoonRepository platoonRepository;
    private final PlatoonStateRepository platoonStateRepository;
    private final TurnRepository turnRepository;
    private final TerritoryRepository territoryRepository;
    private final FactionRepository factionRepository;
    private final NationRepository nationRepository;
    private final ObjectMapper objectMapper;

    public CampaignPlatoonService(CampaignMemberRepository campaignMemberRepository,
                                  PlatoonRepository platoonRepository,
                                  PlatoonStateRepository platoonStateRepository,
                                  TurnRepository turnRepository,
                                  TerritoryRepository territoryRepository,
                                  FactionRepository factionRepository,
                                  NationRepository nationRepository,
                                  ObjectMapper objectMapper) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.platoonRepository = platoonRepository;
        this.platoonStateRepository = platoonStateRepository;
        this.turnRepository = turnRepository;
        this.territoryRepository = territoryRepository;
        this.factionRepository = factionRepository;
        this.nationRepository = nationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<PlayerPlatoonSummaryResponse> listPlatoons(UUID campaignId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        requirePlatoonReadAccess(membership);
        Turn currentTurn = requireCurrentTurn(membership.getCampaign());

        return platoonStateRepository.findAllByCampaignIdAndTurnNumber(campaignId, currentTurn.getTurnNumber()).stream()
                .filter(state -> canViewPlatoon(state, membership))
                .map(this::toPlayerSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public PlatoonDetailResponse getPlatoon(UUID campaignId, UUID platoonId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        requirePlatoonReadAccess(membership);
        Turn currentTurn = requireCurrentTurn(membership.getCampaign());

        PlatoonState state = requireCurrentTurnState(campaignId, platoonId, currentTurn.getTurnNumber());

        if (membership.getRole() == CampaignRole.GM) {
            return toGmDetail(state);
        }

        if (!canViewPlatoon(state, membership)) {
            throw new ApiException("PLATOON_NOT_FOUND", HttpStatus.NOT_FOUND, "Platoon not found");
        }

        return toPlayerDetail(state);
    }

    @Transactional
    public PlatoonDetailResponse createPlatoon(UUID campaignId,
                                               CreateCampaignPlatoonRequest request,
                                               AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        requirePlatoonWriteAccess(membership);
        if (request == null) {
            throw new ApiException("PLATOON_INVALID", HttpStatus.BAD_REQUEST, "Platoon payload is required");
        }

        Campaign campaign = membership.getCampaign();
        Turn currentTurn = requireCurrentTurn(campaign);
        String platoonKey = requireText(request.platoonKey(), "PLATOON_INVALID", "Platoon key is required");
        String name = requireText(request.name(), "PLATOON_INVALID", "Platoon name is required");
        Territory homeTerritory = requireTerritory(campaign.getId(), request.homeTerritoryId());
        Faction faction = resolveFactionForCreate(campaign.getId(), membership, request.factionId());
        Nation nation = resolveNationForCreate(campaign.getId(), membership, faction, request.nationId());
        String unitType = normalizeTextOrDefault(request.unitType(), "LINE");
        boolean hiddenFromPlayers = resolveHiddenFromPlayers(membership, request.hiddenFromPlayers(), false);
        PlatoonReadinessStatus readinessStatus = toReadinessStatus(request.condition(), PlatoonReadinessStatus.ACTIVE);
        int strength = request.strength() != null ? request.strength() : 100;
        PlatoonMetadata metadata = resolveMetadata(null, request.mpBase(), request.traits(), request.entrenched());

        if (platoonRepository.findByCampaignIdAndPlatoonKey(campaign.getId(), platoonKey).isPresent()) {
            throw new ApiException("PLATOON_ALREADY_EXISTS", HttpStatus.CONFLICT, "Platoon key already exists");
        }

        Platoon platoon = new Platoon();
        platoon.setCampaign(campaign);
        platoon.setFaction(faction);
        platoon.setNation(nation);
        platoon.setAssignedMember(membership.getRole() == CampaignRole.PLAYER ? membership : null);
        platoon.setHomeTerritory(homeTerritory);
        platoon.setPlatoonKey(platoonKey);
        platoon.setName(name);
        platoon.setUnitType(unitType);
        platoon.setHiddenFromPlayers(hiddenFromPlayers);
        platoon.setMetadataJson(writeMetadata(null, metadata));
        Platoon savedPlatoon = platoonRepository.save(platoon);

        PlatoonState state = new PlatoonState();
        state.setTurn(currentTurn);
        state.setPlatoon(savedPlatoon);
        state.setTerritory(homeTerritory);
        state.setName(name);
        state.setReadinessStatus(readinessStatus);
        state.setStrength(strength);
        state.setHiddenFromPlayers(hiddenFromPlayers);
        state.setNotes(null);
        platoonStateRepository.save(state);

        return toDetailResponse(state, membership);
    }

    @Transactional
    public PlatoonDetailResponse updatePlatoon(UUID campaignId,
                                               UUID platoonId,
                                               UpdateCampaignPlatoonRequest request,
                                               AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        requirePlatoonWriteAccess(membership);
        if (request == null) {
            throw new ApiException("PLATOON_INVALID", HttpStatus.BAD_REQUEST, "Platoon payload is required");
        }

        Platoon platoon = requirePlatoon(campaignId, platoonId);
        if (!canManagePlatoon(platoon, membership)) {
            throw new ApiException("PLATOON_FORBIDDEN", HttpStatus.FORBIDDEN, "You cannot manage this platoon");
        }

        Turn currentTurn = requireCurrentTurn(membership.getCampaign());
        PlatoonState state = platoonStateRepository.findByPlatoonIdAndCampaignIdAndTurnNumber(platoonId, campaignId, currentTurn.getTurnNumber())
                .orElseGet(() -> newCurrentTurnState(platoon, currentTurn));

        if (request.name() != null) {
            String name = requireText(request.name(), "PLATOON_INVALID", "Platoon name is required");
            platoon.setName(name);
            state.setName(name);
        } else if (state.getName() == null) {
            state.setName(platoon.getName());
        }

        if (request.condition() != null) {
            state.setReadinessStatus(toReadinessStatus(request.condition(), state.getReadinessStatus()));
        }
        if (request.strength() != null) {
            state.setStrength(request.strength());
        }
        if (request.hiddenFromPlayers() != null) {
            if (membership.getRole() != CampaignRole.GM) {
                throw new ApiException("PLATOON_FORBIDDEN", HttpStatus.FORBIDDEN, "Only a GM may change platoon visibility");
            }
            platoon.setHiddenFromPlayers(request.hiddenFromPlayers());
            state.setHiddenFromPlayers(request.hiddenFromPlayers());
        } else if (state.getHiddenFromPlayers() == null) {
            state.setHiddenFromPlayers(platoon.isHiddenFromPlayers());
        }

        PlatoonMetadata metadata = resolveMetadata(platoon.getMetadataJson(), request.mpBase(), request.traits(), request.entrenched());
        platoon.setMetadataJson(writeMetadata(platoon.getMetadataJson(), metadata));

        if (state.getTerritory() == null) {
            state.setTerritory(platoon.getHomeTerritory());
        }
        if (state.getName() == null) {
            state.setName(platoon.getName());
        }

        platoonRepository.save(platoon);
        platoonStateRepository.save(state);

        return toDetailResponse(state, membership);
    }

    private CampaignMember requireMembership(UUID campaignId, UUID userId) {
        return campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    private Turn requireCurrentTurn(Campaign campaign) {
        return turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), campaign.getCurrentTurnNumber())
                .orElseThrow(() -> new ApiException("CAMPAIGN_TURN_NOT_FOUND", HttpStatus.NOT_FOUND, "Current campaign turn not found"));
    }

    private Platoon requirePlatoon(UUID campaignId, UUID platoonId) {
        return platoonRepository.findByIdAndCampaignId(platoonId, campaignId)
                .orElseThrow(() -> new ApiException("PLATOON_NOT_FOUND", HttpStatus.NOT_FOUND, "Platoon not found"));
    }

    private PlatoonState requireCurrentTurnState(UUID campaignId, UUID platoonId, int turnNumber) {
        return platoonStateRepository.findByPlatoonIdAndCampaignIdAndTurnNumber(platoonId, campaignId, turnNumber)
                .orElseThrow(() -> new ApiException("PLATOON_NOT_FOUND", HttpStatus.NOT_FOUND, "Platoon not found"));
    }

    private void requirePlatoonReadAccess(CampaignMember membership) {
        if (membership.getRole() == CampaignRole.OBSERVER) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "Observer role cannot access platoons");
        }
    }

    private void requirePlatoonWriteAccess(CampaignMember membership) {
        if (membership.getRole() == CampaignRole.OBSERVER) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "Observer role cannot manage platoons");
        }
        if (membership.getRole() == CampaignRole.PLAYER && membership.getFaction() == null) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "Faction assignment required for platoon management");
        }
    }

    private boolean canViewPlatoon(PlatoonState state, CampaignMember membership) {
        if (membership.getRole() == CampaignRole.GM) {
            return true;
        }
        if (membership.getRole() != CampaignRole.PLAYER || membership.getFaction() == null) {
            return false;
        }
        if (resolveHiddenFromPlayers(state, state.getPlatoon().isHiddenFromPlayers())) {
            return false;
        }
        if (!state.getPlatoon().getFaction().getId().equals(membership.getFaction().getId())) {
            return false;
        }
        if (membership.getNation() == null || state.getPlatoon().getNation() == null) {
            return true;
        }
        return state.getPlatoon().getNation().getId().equals(membership.getNation().getId());
    }

    private boolean canManagePlatoon(Platoon platoon, CampaignMember membership) {
        if (membership.getRole() == CampaignRole.GM) {
            return true;
        }
        if (membership.getRole() != CampaignRole.PLAYER || membership.getFaction() == null) {
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
        Platoon platoon = state.getPlatoon();
        PlatoonMetadata metadata = readMetadata(platoon.getMetadataJson());
        return new PlayerPlatoonSummaryResponse(
                platoon.getId(),
                platoon.getPlatoonKey(),
                resolveDisplayName(state, platoon),
                platoon.getUnitType(),
                toFactionReference(platoon.getFaction()),
                toNationReference(platoon.getNation()),
                toTerritoryReference(state.getTerritory()),
                state.getReadinessStatus(),
                toCondition(state.getReadinessStatus()),
                state.getStrength(),
                metadata.mpBase(),
                metadata.traits(),
                metadata.entrenched()
        );
    }

    private PlayerPlatoonDetailResponse toPlayerDetail(PlatoonState state) {
        Platoon platoon = state.getPlatoon();
        PlatoonMetadata metadata = readMetadata(platoon.getMetadataJson());
        return new PlayerPlatoonDetailResponse(
                platoon.getId(),
                platoon.getPlatoonKey(),
                resolveDisplayName(state, platoon),
                platoon.getUnitType(),
                toFactionReference(platoon.getFaction()),
                toNationReference(platoon.getNation()),
                toTerritoryReference(platoon.getHomeTerritory()),
                toTerritoryReference(state.getTerritory()),
                state.getReadinessStatus(),
                toCondition(state.getReadinessStatus()),
                state.getStrength(),
                metadata.mpBase(),
                metadata.traits(),
                metadata.entrenched()
        );
    }

    private GmPlatoonDetailResponse toGmDetail(PlatoonState state) {
        Platoon platoon = state.getPlatoon();
        PlatoonMetadata metadata = readMetadata(platoon.getMetadataJson());
        return new GmPlatoonDetailResponse(
                platoon.getId(),
                platoon.getPlatoonKey(),
                resolveDisplayName(state, platoon),
                platoon.getUnitType(),
                resolveHiddenFromPlayers(state, platoon.isHiddenFromPlayers()),
                toFactionReference(platoon.getFaction()),
                toNationReference(platoon.getNation()),
                toMemberReference(platoon.getAssignedMember()),
                toTerritoryReference(platoon.getHomeTerritory()),
                toTerritoryReference(state.getTerritory()),
                state.getReadinessStatus(),
                toCondition(state.getReadinessStatus()),
                state.getStrength(),
                metadata.mpBase(),
                metadata.traits(),
                metadata.entrenched(),
                state.getNotes()
        );
    }

    private PlatoonDetailResponse toDetailResponse(PlatoonState state, CampaignMember membership) {
        if (membership.getRole() == CampaignRole.GM) {
            return toGmDetail(state);
        }
        return toPlayerDetail(state);
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

    private Faction resolveFactionForCreate(UUID campaignId, CampaignMember membership, UUID factionId) {
        if (membership.getRole() == CampaignRole.GM) {
            if (factionId == null) {
                throw new ApiException("PLATOON_INVALID", HttpStatus.BAD_REQUEST, "Faction is required for GM platoon creation");
            }
            return factionRepository.findByIdAndCampaignId(factionId, campaignId)
                    .orElseThrow(() -> new ApiException("FACTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Faction not found"));
        }

        Faction faction = membership.getFaction();
        if (factionId != null && !faction.getId().equals(factionId)) {
            throw new ApiException("PLATOON_FORBIDDEN", HttpStatus.FORBIDDEN, "You cannot create platoons for another faction");
        }
        return faction;
    }

    private Nation resolveNationForCreate(UUID campaignId, CampaignMember membership, Faction faction, UUID nationId) {
        if (nationId == null) {
            return membership.getNation();
        }

        Nation nation = nationRepository.findByIdAndCampaignId(nationId, campaignId)
                .orElseThrow(() -> new ApiException("NATION_NOT_FOUND", HttpStatus.NOT_FOUND, "Nation not found"));
        if (nation.getFaction() != null && faction != null && !nation.getFaction().getId().equals(faction.getId())) {
            throw new ApiException("PLATOON_FORBIDDEN", HttpStatus.FORBIDDEN, "Nation does not belong to the selected faction");
        }

        if (membership.getRole() == CampaignRole.PLAYER) {
            if (membership.getNation() != null && !membership.getNation().getId().equals(nation.getId())) {
                throw new ApiException("PLATOON_FORBIDDEN", HttpStatus.FORBIDDEN, "You cannot create platoons for another nation");
            }
            if (membership.getNation() == null && membership.getFaction() != null && nation.getFaction() != null
                    && !membership.getFaction().getId().equals(nation.getFaction().getId())) {
                throw new ApiException("PLATOON_FORBIDDEN", HttpStatus.FORBIDDEN, "You cannot create platoons for another faction");
            }
        }

        return nation;
    }

    private Territory requireTerritory(UUID campaignId, UUID territoryId) {
        if (territoryId == null) {
            throw new ApiException("PLATOON_INVALID", HttpStatus.BAD_REQUEST, "Home territory is required");
        }
        return territoryRepository.findByIdAndCampaignId(territoryId, campaignId)
                .orElseThrow(() -> new ApiException("TERRITORY_NOT_FOUND", HttpStatus.NOT_FOUND, "Territory not found"));
    }

    private PlatoonState newCurrentTurnState(Platoon platoon, Turn currentTurn) {
        PlatoonState state = new PlatoonState();
        state.setTurn(currentTurn);
        state.setPlatoon(platoon);
        state.setTerritory(platoon.getHomeTerritory());
        state.setName(platoon.getName());
        state.setReadinessStatus(PlatoonReadinessStatus.ACTIVE);
        state.setStrength(100);
        state.setHiddenFromPlayers(platoon.isHiddenFromPlayers());
        return state;
    }

    private String resolveDisplayName(PlatoonState state, Platoon platoon) {
        return state.getName() != null && !state.getName().isBlank() ? state.getName() : platoon.getName();
    }

    private boolean resolveHiddenFromPlayers(PlatoonState state, boolean fallback) {
        return state.getHiddenFromPlayers() != null ? state.getHiddenFromPlayers() : fallback;
    }

    private PlatoonCondition toCondition(PlatoonReadinessStatus readinessStatus) {
        if (readinessStatus == null) {
            return PlatoonCondition.FRESH;
        }
        return switch (readinessStatus) {
            case ACTIVE -> PlatoonCondition.FRESH;
            case DAMAGED -> PlatoonCondition.WORN;
            case RESERVES -> PlatoonCondition.DEPLETED;
            case DESTROYED -> PlatoonCondition.SHATTERED;
        };
    }

    private PlatoonReadinessStatus toReadinessStatus(PlatoonCondition condition, PlatoonReadinessStatus fallback) {
        if (condition == null) {
            return fallback;
        }
        return switch (condition) {
            case FRESH -> PlatoonReadinessStatus.ACTIVE;
            case WORN -> PlatoonReadinessStatus.DAMAGED;
            case DEPLETED -> PlatoonReadinessStatus.RESERVES;
            case SHATTERED -> PlatoonReadinessStatus.DESTROYED;
        };
    }

    private PlatoonMetadata readMetadata(String metadataJson) {
        ObjectNode metadata = readObject(metadataJson);
        int mpBase = metadata.path("mpBase").asInt(1);
        boolean entrenched = metadata.path("entrenched").asBoolean(false);
        List<String> traits = new ArrayList<>();
        JsonNode traitsNode = metadata.get("traits");
        if (traitsNode != null && traitsNode.isArray()) {
            for (JsonNode traitNode : traitsNode) {
                if (traitNode != null && !traitNode.isNull() && !traitNode.asText().isBlank()) {
                    traits.add(traitNode.asText().trim().toUpperCase(Locale.ROOT));
                }
            }
        }
        return new PlatoonMetadata(mpBase, List.copyOf(traits), entrenched);
    }

    private PlatoonMetadata resolveMetadata(String existingMetadataJson,
                                            Integer mpBase,
                                            List<String> traits,
                                            Boolean entrenched) {
        PlatoonMetadata existing = readMetadata(existingMetadataJson);
        int resolvedMpBase = mpBase != null ? mpBase : existing.mpBase();
        List<String> resolvedTraits = traits != null ? normalizeTraits(traits) : existing.traits();
        boolean resolvedEntrenched = entrenched != null ? entrenched : existing.entrenched();
        return new PlatoonMetadata(Math.max(1, resolvedMpBase), resolvedTraits, resolvedEntrenched);
    }

    private List<String> normalizeTraits(List<String> traits) {
        if (traits == null || traits.isEmpty()) {
            return List.of();
        }
        Set<String> values = new LinkedHashSet<>();
        for (String trait : traits) {
            if (trait == null || trait.isBlank()) {
                continue;
            }
            values.add(trait.trim().toUpperCase(Locale.ROOT));
        }
        return List.copyOf(values);
    }

    private String writeMetadata(String existingMetadataJson, PlatoonMetadata metadata) {
        ObjectNode node = readObject(existingMetadataJson);
        node.put("mpBase", Math.max(1, metadata.mpBase()));
        ArrayNode traitsNode = objectMapper.createArrayNode();
        for (String trait : metadata.traits()) {
            traitsNode.add(trait);
        }
        node.set("traits", traitsNode);
        node.put("entrenched", metadata.entrenched());
        return writeJson(node);
    }

    private ObjectNode readObject(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            JsonNode parsed = objectMapper.readTree(rawJson);
            return parsed != null && parsed.isObject() ? (ObjectNode) parsed : objectMapper.createObjectNode();
        } catch (JsonProcessingException exception) {
            throw new ApiException("PLATOON_METADATA_INVALID", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse platoon metadata");
        }
    }

    private String writeJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException exception) {
            throw new ApiException("PLATOON_METADATA_INVALID", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize platoon metadata");
        }
    }

    private String requireText(String value, String code, String message) {
        if (value == null || value.isBlank()) {
            throw new ApiException(code, HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private String normalizeTextOrDefault(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    private boolean resolveHiddenFromPlayers(CampaignMember membership, Boolean requested, boolean fallback) {
        if (requested == null) {
            return fallback;
        }
        if (membership.getRole() != CampaignRole.GM) {
            throw new ApiException("PLATOON_FORBIDDEN", HttpStatus.FORBIDDEN, "Only a GM may change platoon visibility");
        }
        return requested;
    }

    private record PlatoonMetadata(int mpBase, List<String> traits, boolean entrenched) {
    }
}
