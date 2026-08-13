package com.warcampaign.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.TerritoryState;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.dto.CreateSpCustomNationRequest;
import com.warcampaign.backend.dto.SpNationSummaryResponse;
import com.warcampaign.backend.dto.SpSetupDataResponse;
import com.warcampaign.backend.dto.SpSetupNationChoice;
import com.warcampaign.backend.dto.SpSetupRequest;
import com.warcampaign.backend.dto.SpSetupResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
import com.warcampaign.backend.repository.PlatoonRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TerritoryRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.repository.UserRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SinglePlayerSetupService {

    // Static nation definitions matching NationDefinitions.ts
    private static final List<NationDef> NATION_DEFINITIONS = List.of(
            new NationDef("great_britain", "Great Britain", "allies", List.of("WE-01", "WE-02")),
            new NationDef("france", "France", "allies", List.of("WE-04", "WE-05", "WE-06")),
            new NationDef("belgium", "Belgium", "allies", List.of("WE-07")),
            new NationDef("netherlands", "The Netherlands", "allies", List.of("WE-07")),
            new NationDef("norway", "Norway", "allies", List.of("WE-15")),
            new NationDef("germany", "Germany", "axis", List.of("WE-08", "WE-09")),
            new NationDef("italy", "Italy", "axis", List.of("WE-10", "WE-11")),
            new NationDef("poland", "Poland", "allies", List.of("EE-07", "EE-08")),
            new NationDef("polish_ppa", "Polish People's Army", "ussr", List.of("EE-08")),
            new NationDef("soviet_union", "Soviet Union", "ussr", List.of("EE-05", "EE-06")),
            new NationDef("finland", "Finland", "axis", List.of("EE-01")),
            new NationDef("romania", "Romania", "axis", List.of("EE-14")),
            new NationDef("bulgaria", "Bulgaria", "axis", List.of("EE-14")),
            new NationDef("hungary", "Hungary", "axis", List.of("EE-15")),
            new NationDef("greece", "Greece", "allies", List.of("EE-15")),
            new NationDef("united_states", "United States", "allies", List.of("PA-15")),
            new NationDef("imperial_japan", "Imperial Japan", "axis", List.of("PA-01", "PA-02")),
            new NationDef("partisans", "Partisans", null, List.of())
    );

    private record NationDef(String key, String name, String defaultFactionKey, List<String> homelandTerritoryKeys) {}

    private final CampaignRepository campaignRepository;
    private final CampaignMemberRepository campaignMemberRepository;
    private final FactionRepository factionRepository;
    private final NationRepository nationRepository;
    private final TerritoryRepository territoryRepository;
    private final TerritoryStateRepository territoryStateRepository;
    private final TurnRepository turnRepository;
    private final PlatoonRepository platoonRepository;
    private final PlatoonStateRepository platoonStateRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public SinglePlayerSetupService(CampaignRepository campaignRepository,
                                    CampaignMemberRepository campaignMemberRepository,
                                    FactionRepository factionRepository,
                                    NationRepository nationRepository,
                                    TerritoryRepository territoryRepository,
                                    TerritoryStateRepository territoryStateRepository,
                                    TurnRepository turnRepository,
                                    PlatoonRepository platoonRepository,
                                    PlatoonStateRepository platoonStateRepository,
                                    UserRepository userRepository,
                                    ObjectMapper objectMapper) {
        this.campaignRepository = campaignRepository;
        this.campaignMemberRepository = campaignMemberRepository;
        this.factionRepository = factionRepository;
        this.nationRepository = nationRepository;
        this.territoryRepository = territoryRepository;
        this.territoryStateRepository = territoryStateRepository;
        this.turnRepository = turnRepository;
        this.platoonRepository = platoonRepository;
        this.platoonStateRepository = platoonStateRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public SpSetupDataResponse getSetupData(UUID campaignId, AuthenticatedUser authenticatedUser) {
        requireCreatorOrGm(campaignId, authenticatedUser.id());

        List<SpNationSummaryResponse> nations = nationRepository.findAllByCampaignIdOrderByNameAsc(campaignId).stream()
                .map(n -> {
                    String suggestedHomeland = NATION_DEFINITIONS.stream()
                            .filter(d -> d.key().equals(n.getNationKey()))
                            .findFirst()
                            .map(d -> d.homelandTerritoryKeys().isEmpty() ? null : d.homelandTerritoryKeys().get(0))
                            .orElse(null);
                    return new SpNationSummaryResponse(
                            n.getId(),
                            n.getNationKey(),
                            n.getName(),
                            n.getFaction() != null ? n.getFaction().getFactionKey() : null,
                            n.getFaction() != null ? n.getFaction().getName() : null,
                            n.getColor(),
                            suggestedHomeland);
                })
                .toList();

        List<SpSetupDataResponse.TerritoryOptionDto> territories =
                territoryRepository.findAllByCampaignIdOrderByNameAsc(campaignId).stream()
                        .map(t -> new SpSetupDataResponse.TerritoryOptionDto(t.getTerritoryKey(), t.getName()))
                        .toList();

        return new SpSetupDataResponse(nations, territories);
    }

    @Transactional
    public SpSetupResponse completeSinglePlayerSetup(UUID campaignId,
                                                     SpSetupRequest request,
                                                     AuthenticatedUser authenticatedUser) {
        Campaign campaign = requireCreatorOrGm(campaignId, authenticatedUser.id());

        // Guard: only in LOBBY phase, only once
        if (campaign.getCurrentPhase() != CampaignPhase.LOBBY) {
            throw new ApiException("SP_SETUP_PHASE", HttpStatus.CONFLICT, "Single player setup can only be done in the LOBBY phase");
        }
        if (isSpSetupComplete(campaign)) {
            throw new ApiException("SP_SETUP_ALREADY_DONE", HttpStatus.CONFLICT, "Single player setup has already been completed");
        }

        List<SpSetupNationChoice> choices = request.nations() != null ? request.nations() : List.of();
        SpSetupNationChoice humanChoice = choices.stream()
                .filter(c -> "HUMAN".equals(c.assignment()))
                .findFirst()
                .orElseThrow(() -> new ApiException("SP_SETUP_NO_HUMAN", HttpStatus.BAD_REQUEST, "Exactly one nation must be assigned to HUMAN"));

        List<SpSetupNationChoice> cpuChoices = choices.stream()
                .filter(c -> "CPU".equals(c.assignment()))
                .toList();

        // Find the human GM member
        User creator = userRepository.findById(authenticatedUser.id())
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.UNAUTHORIZED, "User not found"));
        CampaignMember gmMember = campaignMemberRepository.findByCampaignAndUser(campaign, creator)
                .orElseThrow(() -> new ApiException("MEMBER_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign member not found"));

        Turn turn = turnRepository.findByCampaignIdAndTurnNumber(campaignId, campaign.getCurrentTurnNumber())
                .orElseThrow(() -> new ApiException("TURN_NOT_FOUND", HttpStatus.NOT_FOUND, "Current turn not found"));

        // Build territory lookup map
        Map<String, Territory> territoryByKey = new HashMap<>();
        territoryRepository.findAllByCampaignIdOrderByNameAsc(campaignId)
                .forEach(t -> territoryByKey.put(t.getTerritoryKey(), t));

        // Build nation lookup map
        Map<String, Nation> nationByKey = new HashMap<>();
        nationRepository.findAllByCampaignIdOrderByNameAsc(campaignId)
                .forEach(n -> nationByKey.put(n.getNationKey(), n));

        // Build faction lookup map
        Map<String, Faction> factionByKey = new HashMap<>();
        factionRepository.findAllByCampaignIdOrderByNameAsc(campaignId)
                .forEach(f -> factionByKey.put(f.getFactionKey(), f));

        // Assign human member
        Nation humanNation = nationByKey.get(humanChoice.nationKey());
        if (humanNation == null) {
            throw new ApiException("SP_SETUP_INVALID_NATION", HttpStatus.BAD_REQUEST, "Nation not found: " + humanChoice.nationKey());
        }
        gmMember.setNation(humanNation);
        gmMember.setFaction(humanNation.getFaction());
        campaignMemberRepository.save(gmMember);

        // Create starter platoon for human
        Territory humanHomeland = resolveHomelandForChoice(humanChoice, humanNation, territoryByKey);
        if (humanHomeland != null) {
            createStarterPlatoon(campaign, gmMember, humanNation.getFaction(), humanNation, humanHomeland, turn,
                    humanNation.getNationKey() + "-1",
                    humanNation.getName() + " 1st Platoon");
            markHomelandControlled(turn, humanHomeland, humanNation.getFaction(), humanNation);
        }

        // Create CPU members for each CPU nation
        int cpuCount = 0;
        for (SpSetupNationChoice cpuChoice : cpuChoices) {
            Nation cpuNation = nationByKey.get(cpuChoice.nationKey());
            if (cpuNation == null) continue;

            String strategy = cpuChoice.cpuStrategy() != null ? cpuChoice.cpuStrategy().toUpperCase() : "BALANCED";
            if (!List.of("AGGRESSIVE", "DEFENSIVE", "BALANCED").contains(strategy)) {
                strategy = "BALANCED";
            }

            // Create synthetic CPU user
            String cpuEmail = "cpu-" + cpuNation.getNationKey() + "-" + campaignId + "@system.war";
            String cpuDisplayName = cpuNation.getName() + " (CPU)";
            User cpuUser = userRepository.findByEmailIgnoreCase(cpuEmail)
                    .orElseGet(() -> {
                        User u = new User();
                        u.setEmail(cpuEmail);
                        u.setDisplayName(cpuDisplayName);
                        u.setActive(false);
                        return userRepository.save(u);
                    });

            CampaignMember cpuMember = new CampaignMember();
            cpuMember.setCampaign(campaign);
            cpuMember.setUser(cpuUser);
            cpuMember.setRole(CampaignRole.PLAYER);
            cpuMember.setNation(cpuNation);
            cpuMember.setFaction(cpuNation.getFaction());
            cpuMember.setCpuControlled(true);
            cpuMember.setCpuStrategy(strategy);
            CampaignMember savedCpuMember = campaignMemberRepository.save(cpuMember);

            Territory cpuHomeland = resolveHomelandForChoice(cpuChoice, cpuNation, territoryByKey);
            if (cpuHomeland != null) {
                createStarterPlatoon(campaign, savedCpuMember, cpuNation.getFaction(), cpuNation, cpuHomeland, turn,
                        cpuNation.getNationKey() + "-1",
                        cpuNation.getName() + " 1st Platoon");
                markHomelandControlled(turn, cpuHomeland, cpuNation.getFaction(), cpuNation);
            }
            cpuCount++;
        }

        // Mark SP setup complete and enable AI GM in metadata
        String meta = campaign.getMetadataJson() != null ? campaign.getMetadataJson() : "{}";
        meta = mergeMetadataFlags(meta, true, true);
        campaign.setMetadataJson(meta);

        // Auto-advance LOBBY → STRATEGIC
        campaign.setCurrentPhase(CampaignPhase.STRATEGIC);
        campaign.setPhaseStartedAt(Instant.now());
        turn.setPhase(CampaignPhase.STRATEGIC);
        campaignRepository.save(campaign);
        turnRepository.save(turn);

        return new SpSetupResponse(
                campaignId,
                humanNation.getNationKey(),
                cpuCount,
                "/app/campaigns/" + campaignId + "/dashboard"
        );
    }

    @Transactional
    public SpNationSummaryResponse createCustomNation(UUID campaignId,
                                                      CreateSpCustomNationRequest request,
                                                      AuthenticatedUser authenticatedUser) {
        Campaign campaign = requireCreatorOrGm(campaignId, authenticatedUser.id());

        if (campaign.getCurrentPhase() != CampaignPhase.LOBBY) {
            throw new ApiException("SP_SETUP_PHASE", HttpStatus.CONFLICT, "Custom nations can only be added during the LOBBY phase");
        }
        if (isSpSetupComplete(campaign)) {
            throw new ApiException("SP_SETUP_ALREADY_DONE", HttpStatus.CONFLICT, "Setup is already complete");
        }
        if (request.name() == null || request.name().isBlank()) {
            throw new ApiException("NATION_NAME_REQUIRED", HttpStatus.BAD_REQUEST, "Nation name is required");
        }

        // Resolve faction (optional)
        Faction faction = null;
        if (request.factionKey() != null && !request.factionKey().isBlank()) {
            faction = factionRepository.findByCampaignIdAndFactionKey(campaignId, request.factionKey()).orElse(null);
        }

        // Generate a unique key from the name — use custom: prefix to match bridge/frontend convention
        String slug = request.name().toLowerCase().replaceAll("[^a-z0-9]+", "_").replaceAll("_+$", "");
        String key = "custom:" + slug;
        // Ensure uniqueness
        String baseSlug = slug;
        int attempt = 2;
        while (nationRepository.findByCampaignIdAndNationKey(campaignId, key).isPresent()) {
            key = "custom:" + baseSlug + "_" + attempt++;
        }

        Nation nation = new Nation();
        nation.setCampaign(campaign);
        nation.setNationKey(key);
        nation.setName(request.name().trim());
        nation.setFaction(faction);
        if (request.color() != null && !request.color().isBlank()) {
            nation.setColor(request.color().trim());
        }
        Nation saved = nationRepository.save(nation);

        return new SpNationSummaryResponse(
                saved.getId(),
                saved.getNationKey(),
                saved.getName(),
                faction != null ? faction.getFactionKey() : null,
                faction != null ? faction.getName() : null,
                saved.getColor(),
                null);
    }

    private Territory resolveHomelandForChoice(SpSetupNationChoice choice, Nation nation, Map<String, Territory> territoryByKey) {
        // Prefer the player-selected homeland if provided
        if (choice.homelandTerritoryKey() != null && !choice.homelandTerritoryKey().isBlank()) {
            Territory t = territoryByKey.get(choice.homelandTerritoryKey());
            if (t != null) return t;
        }
        return resolveHomeland(nation, territoryByKey);
    }

    private Territory resolveHomeland(Nation nation, Map<String, Territory> territoryByKey) {
        NationDef def = NATION_DEFINITIONS.stream()
                .filter(d -> d.key().equals(nation.getNationKey()))
                .findFirst()
                .orElse(null);
        if (def == null || def.homelandTerritoryKeys().isEmpty()) return null;
        // Return first matching homeland territory that exists in this campaign
        for (String key : def.homelandTerritoryKeys()) {
            Territory t = territoryByKey.get(key);
            if (t != null) return t;
        }
        return null;
    }

    private void createStarterPlatoon(Campaign campaign, CampaignMember member, Faction faction,
                                      Nation nation, Territory homeland, Turn turn,
                                      String platoonKey, String platoonName) {
        Platoon platoon = new Platoon();
        platoon.setCampaign(campaign);
        platoon.setFaction(faction);
        platoon.setNation(nation);
        platoon.setAssignedMember(member);
        platoon.setHomeTerritory(homeland);
        platoon.setPlatoonKey(platoonKey);
        platoon.setName(platoonName);
        platoon.setUnitType("INFANTRY");
        platoon.setHiddenFromPlayers(false);
        platoon.setMetadataJson("{\"mpBase\":1,\"traits\":[],\"entrenched\":false}");
        Platoon saved = platoonRepository.save(platoon);

        PlatoonState state = new PlatoonState();
        state.setTurn(turn);
        state.setPlatoon(saved);
        state.setTerritory(homeland);
        state.setName(platoonName);
        state.setReadinessStatus(com.warcampaign.backend.domain.enums.PlatoonReadinessStatus.ACTIVE);
        state.setStrength(100);
        state.setHiddenFromPlayers(false);
        platoonStateRepository.save(state);
    }

    private void markHomelandControlled(Turn turn, Territory territory, Faction faction, Nation nation) {
        territoryStateRepository.findByTurnIdAndTerritoryId(turn.getId(), territory.getId())
                .ifPresent(state -> {
                    state.setControllingFaction(faction);
                    state.setControllerNation(nation);
                    state.setStrategicStatus(TerritoryStrategicStatus.CONTROLLED);
                    territoryStateRepository.save(state);
                });
    }

    private String mergeMetadataFlags(String meta, boolean aiGm, boolean spSetupComplete) {
        meta = meta.trim();
        // Remove trailing } and append new keys
        if (meta.endsWith("}")) {
            String inner = meta.substring(1, meta.length() - 1).trim();
            if (inner.isEmpty()) {
                return "{\"aiGm\":" + aiGm + ",\"spSetupComplete\":" + spSetupComplete + "}";
            } else {
                return "{" + inner + ",\"aiGm\":" + aiGm + ",\"spSetupComplete\":" + spSetupComplete + "}";
            }
        }
        return "{\"aiGm\":" + aiGm + ",\"spSetupComplete\":" + spSetupComplete + "}";
    }

    private boolean isSpSetupComplete(Campaign campaign) {
        if (campaign.getMetadataJson() == null) return false;
        try {
            JsonNode root = objectMapper.readTree(campaign.getMetadataJson());
            return root.path("spSetupComplete").asBoolean(false);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isSinglePlayerCampaign(Campaign campaign) {
        if (campaign.getMetadataJson() == null) return false;
        try {
            JsonNode root = objectMapper.readTree(campaign.getMetadataJson());
            return root.path("aiGm").asBoolean(false) || root.path("singlePlayer").asBoolean(false);
        } catch (Exception e) {
            return false;
        }
    }

    private Campaign requireCreatorOrGm(UUID campaignId, UUID userId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
        CampaignMember member = campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
        if (member.getRole() != CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required for single player setup");
        }
        return campaign;
    }
}
