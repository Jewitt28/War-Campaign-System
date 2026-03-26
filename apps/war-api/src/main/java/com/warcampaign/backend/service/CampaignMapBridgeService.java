package com.warcampaign.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.warcampaign.backend.domain.enums.AuditActorType;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignAuditLog;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.Theatre;
import com.warcampaign.backend.dto.CampaignBridgeCustomFactionRequest;
import com.warcampaign.backend.dto.CampaignBridgeCustomFactionResponse;
import com.warcampaign.backend.dto.CampaignBridgeCustomNationRequest;
import com.warcampaign.backend.dto.CampaignBridgeCustomNationResponse;
import com.warcampaign.backend.dto.CampaignMapBridgeResponse;
import com.warcampaign.backend.dto.CampaignNationStateResponse;
import com.warcampaign.backend.dto.SaveCampaignMapSetupRequest;
import com.warcampaign.backend.dto.SaveCampaignNationStateRequest;
import com.warcampaign.backend.dto.SaveCampaignNationStatesRequest;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignAuditLogRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
import com.warcampaign.backend.repository.TheatreRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CampaignMapBridgeService {

    private static final String CAMPAIGN_SETUP_ENTITY = "CAMPAIGN_MAP_SETUP";
    private static final String NATION_STATE_ENTITY = "CAMPAIGN_NATION_STATE";

    private static final Map<String, BaseNationTemplate> BASE_NATION_TEMPLATES = Map.ofEntries(
            Map.entry("belgium", new BaseNationTemplate("Belgium", "allies")),
            Map.entry("bulgaria", new BaseNationTemplate("Bulgaria", "axis")),
            Map.entry("finland", new BaseNationTemplate("Finland", "axis")),
            Map.entry("france", new BaseNationTemplate("France", "allies")),
            Map.entry("germany", new BaseNationTemplate("Germany", "axis")),
            Map.entry("great_britain", new BaseNationTemplate("Great Britain", "allies")),
            Map.entry("greece", new BaseNationTemplate("Greece", "allies")),
            Map.entry("hungary", new BaseNationTemplate("Hungary", "axis")),
            Map.entry("imperial_japan", new BaseNationTemplate("Imperial Japan", "axis")),
            Map.entry("italy", new BaseNationTemplate("Italy", "axis")),
            Map.entry("norway", new BaseNationTemplate("Norway", "allies")),
            Map.entry("partisans", new BaseNationTemplate("Partisans", "allies")),
            Map.entry("poland", new BaseNationTemplate("Poland", "allies")),
            Map.entry("polish_peoples_army", new BaseNationTemplate("Polish People's Army", "ussr")),
            Map.entry("romania", new BaseNationTemplate("Romania", "axis")),
            Map.entry("soviet_union", new BaseNationTemplate("Soviet Union", "ussr")),
            Map.entry("the_netherlands", new BaseNationTemplate("The Netherlands", "allies")),
            Map.entry("us", new BaseNationTemplate("United States", "allies"))
    );

    private static final Map<String, String> BASE_FACTION_NAMES = Map.of(
            "allies", "Allies",
            "axis", "Axis",
            "ussr", "USSR"
    );

    private final CampaignMemberRepository campaignMemberRepository;
    private final CampaignAuditLogRepository campaignAuditLogRepository;
    private final TheatreRepository theatreRepository;
    private final FactionRepository factionRepository;
    private final NationRepository nationRepository;
    private final ObjectMapper objectMapper;

    public CampaignMapBridgeService(CampaignMemberRepository campaignMemberRepository,
                                    CampaignAuditLogRepository campaignAuditLogRepository,
                                    TheatreRepository theatreRepository,
                                    FactionRepository factionRepository,
                                    NationRepository nationRepository,
                                    ObjectMapper objectMapper) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.campaignAuditLogRepository = campaignAuditLogRepository;
        this.theatreRepository = theatreRepository;
        this.factionRepository = factionRepository;
        this.nationRepository = nationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public CampaignMapBridgeResponse getBridge(UUID campaignId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        Campaign campaign = membership.getCampaign();
        List<Faction> factions = factionRepository.findAllByCampaignIdOrderByNameAsc(campaignId);
        List<Nation> nations = nationRepository.findAllByCampaignIdOrderByNameAsc(campaignId);
        List<Theatre> theatres = theatreRepository.findAllByCampaignIdOrderByDisplayOrderAscNameAsc(campaignId);

        ObjectNode campaignMetadata = readObject(campaign.getMetadataJson());
        Map<String, Boolean> nationsEnabled = readBooleanMap(campaignMetadata.path("nationsEnabled"));
        if (nationsEnabled.isEmpty()) {
            for (Nation nation : nations) {
                nationsEnabled.put(nation.getNationKey(), true);
            }
        }

        Map<String, Boolean> activeTheatres = theatres.stream()
                .collect(Collectors.toMap(
                        Theatre::getTheatreKey,
                        Theatre::isActive,
                        (left, right) -> right,
                        LinkedHashMap::new
                ));

        List<CampaignBridgeCustomFactionResponse> customFactions = factions.stream()
                .filter(faction -> isCustomKey(faction.getFactionKey()))
                .map(this::toCustomFactionResponse)
                .toList();

        List<CampaignBridgeCustomNationResponse> customNations = nations.stream()
                .filter(nation -> isCustomKey(nation.getNationKey()))
                .map(this::toCustomNationResponse)
                .toList();

        Map<String, String> homelandsByNation = new LinkedHashMap<>();
        for (Nation nation : nations) {
            ObjectNode metadata = readObject(nation.getMetadataJson());
            String homelandTerritoryKey = readText(metadata, "homelandTerritoryKey");
            if (homelandTerritoryKey != null) {
                homelandsByNation.put(nation.getNationKey(), homelandTerritoryKey);
            }
        }

        Map<String, CampaignNationStateResponse> nationStates = new LinkedHashMap<>();
        Set<String> allowedNationKeys = resolveAllowedNationKeys(membership, nations);
        for (Nation nation : nations) {
            if (allowedNationKeys.contains(nation.getNationKey())) {
                nationStates.put(nation.getNationKey(), toNationStateResponse(nation));
            }
        }

        return new CampaignMapBridgeResponse(
                campaignMetadata.path("useDefaultFactions").asBoolean(true),
                activeTheatres,
                nationsEnabled,
                customFactions,
                customNations,
                homelandsByNation,
                nationStates
        );
    }

    @Transactional
    public CampaignMapBridgeResponse saveSetup(UUID campaignId,
                                               SaveCampaignMapSetupRequest request,
                                               AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        requireGm(membership);

        CampaignMapBridgeResponse before = getBridge(campaignId, authenticatedUser);
        Campaign campaign = membership.getCampaign();
        ObjectNode campaignMetadata = readObject(campaign.getMetadataJson());
        campaignMetadata.set("nationsEnabled", objectMapper.valueToTree(request.nationsEnabled() != null ? request.nationsEnabled() : Map.of()));
        campaignMetadata.put("useDefaultFactions", request.useDefaultFactions());
        campaign.setMetadataJson(writeJson(campaignMetadata));

        Map<String, Theatre> theatresByKey = theatreRepository.findAllByCampaignIdOrderByDisplayOrderAscNameAsc(campaignId).stream()
                .collect(Collectors.toMap(Theatre::getTheatreKey, theatre -> theatre, (left, right) -> right, LinkedHashMap::new));
        if (request.activeTheatres() != null) {
            for (Map.Entry<String, Boolean> entry : request.activeTheatres().entrySet()) {
                Theatre theatre = theatresByKey.get(entry.getKey());
                if (theatre != null && entry.getValue() != null) {
                    theatre.setActive(entry.getValue());
                }
            }
        }

        Map<String, Faction> factionsByKey = factionRepository.findAllByCampaignIdOrderByNameAsc(campaignId).stream()
                .collect(Collectors.toMap(Faction::getFactionKey, faction -> faction, (left, right) -> right, LinkedHashMap::new));

        ensureBaseFactions(campaign, factionsByKey, request);
        upsertCustomFactions(campaign, request.customFactions(), factionsByKey);
        upsertNations(campaign, request, factionsByKey);
        applyHomelands(campaignId, request.homelandsByNation());

        CampaignMapBridgeResponse after = getBridge(campaignId, authenticatedUser);
        writeAudit(membership, "CAMPAIGN_MAP_SETUP_SAVED", CAMPAIGN_SETUP_ENTITY, campaign.getId(), before, after);
        return after;
    }

    @Transactional
    public CampaignMapBridgeResponse saveNationStates(UUID campaignId,
                                                      SaveCampaignNationStatesRequest request,
                                                      AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        Map<String, SaveCampaignNationStateRequest> requestedStates = request.nationStates() != null
                ? request.nationStates()
                : Map.of();

        if (requestedStates.isEmpty()) {
            return getBridge(campaignId, authenticatedUser);
        }

        CampaignMapBridgeResponse before = getBridge(campaignId, authenticatedUser);
        Map<String, Nation> nationsByKey = nationRepository.findAllByCampaignIdOrderByNameAsc(campaignId).stream()
                .collect(Collectors.toMap(Nation::getNationKey, nation -> nation, (left, right) -> right, LinkedHashMap::new));

        for (Map.Entry<String, SaveCampaignNationStateRequest> entry : requestedStates.entrySet()) {
            Nation nation = nationsByKey.get(entry.getKey());
            if (nation == null) {
                throw new ApiException("CAMPAIGN_NATION_NOT_FOUND", HttpStatus.NOT_FOUND, "Nation not found for command-state persistence");
            }
            validateNationStateWriteAccess(membership, nation);
            applyNationState(nation, entry.getValue());
        }

        CampaignMapBridgeResponse after = getBridge(campaignId, authenticatedUser);
        writeAudit(membership, "CAMPAIGN_NATION_STATE_SAVED", NATION_STATE_ENTITY, membership.getCampaign().getId(), before, after);
        return after;
    }

    private void ensureBaseFactions(Campaign campaign,
                                    Map<String, Faction> factionsByKey,
                                    SaveCampaignMapSetupRequest request) {
        Set<String> requiredFactionKeys = new LinkedHashSet<>();
        if (request.useDefaultFactions()) {
            if (request.nationsEnabled() != null) {
                for (Map.Entry<String, Boolean> entry : request.nationsEnabled().entrySet()) {
                    if (!Boolean.TRUE.equals(entry.getValue())) {
                        continue;
                    }
                    BaseNationTemplate template = BASE_NATION_TEMPLATES.get(entry.getKey());
                    if (template != null) {
                        requiredFactionKeys.add(template.defaultFactionKey());
                    }
                }
            }
            if (request.customNations() != null) {
                for (CampaignBridgeCustomNationRequest nation : request.customNations()) {
                    if (nation.defaultFactionKey() != null && BASE_FACTION_NAMES.containsKey(nation.defaultFactionKey())) {
                        requiredFactionKeys.add(nation.defaultFactionKey());
                    }
                }
            }
        }

        for (String factionKey : requiredFactionKeys) {
            factionsByKey.computeIfAbsent(factionKey, key -> factionRepository.save(newFaction(campaign, key, BASE_FACTION_NAMES.getOrDefault(key, key), null)));
        }
    }

    private void upsertCustomFactions(Campaign campaign,
                                      List<CampaignBridgeCustomFactionRequest> customFactions,
                                      Map<String, Faction> factionsByKey) {
        if (customFactions == null) {
            return;
        }
        for (CampaignBridgeCustomFactionRequest customFaction : customFactions) {
            if (customFaction == null || customFaction.id() == null || customFaction.id().isBlank()) {
                continue;
            }
            String factionKey = toCustomKey(customFaction.id());
            Faction faction = factionsByKey.get(factionKey);
            if (faction == null) {
                faction = newFaction(campaign, factionKey, safeName(customFaction.name(), "Custom Faction"), customFaction.color());
            } else {
                faction.setName(safeName(customFaction.name(), faction.getName()));
                faction.setColor(customFaction.color());
            }
            faction.setType(FactionType.MAJOR);
            faction.setPlayerControlled(true);
            factionsByKey.put(factionKey, factionRepository.save(faction));
        }
    }

    private void upsertNations(Campaign campaign,
                               SaveCampaignMapSetupRequest request,
                               Map<String, Faction> factionsByKey) {
        Map<String, Nation> nationsByKey = nationRepository.findAllByCampaignIdOrderByNameAsc(campaign.getId()).stream()
                .collect(Collectors.toMap(Nation::getNationKey, nation -> nation, (left, right) -> right, LinkedHashMap::new));
        Map<String, CampaignBridgeCustomNationRequest> customNationRequests = request.customNations() != null
                ? request.customNations().stream()
                .filter(nation -> nation != null && nation.key() != null && !nation.key().isBlank())
                .collect(Collectors.toMap(CampaignBridgeCustomNationRequest::key, nation -> nation, (left, right) -> right, LinkedHashMap::new))
                : Map.of();

        if (request.nationsEnabled() == null) {
            return;
        }

        for (Map.Entry<String, Boolean> entry : request.nationsEnabled().entrySet()) {
            if (!Boolean.TRUE.equals(entry.getValue())) {
                continue;
            }
            String nationKey = entry.getKey();
            Nation nation = nationsByKey.get(nationKey);
            if (nation == null) {
                nation = new Nation();
                nation.setCampaign(campaign);
                nation.setNationKey(nationKey);
            }

            CampaignBridgeCustomNationRequest customNation = customNationRequests.get(nationKey);
            if (customNation != null) {
                nation.setName(safeName(customNation.name(), "Custom Nation"));
                nation.setFaction(resolveNationFaction(request.useDefaultFactions(), customNation.defaultFactionKey(), factionsByKey));
                ObjectNode metadata = readObject(nation.getMetadataJson());
                writeText(metadata, "defaultFactionKey", customNation.defaultFactionKey());
                writeText(metadata, "color", customNation.color());
                nation.setMetadataJson(writeJson(metadata));
            } else {
                BaseNationTemplate template = BASE_NATION_TEMPLATES.get(nationKey);
                if (template == null) {
                    continue;
                }
                nation.setName(template.name());
                nation.setFaction(request.useDefaultFactions()
                        ? factionsByKey.get(template.defaultFactionKey())
                        : null);
            }

            nationRepository.save(nation);
        }
    }

    private void applyHomelands(UUID campaignId, Map<String, String> homelandsByNation) {
        if (homelandsByNation == null || homelandsByNation.isEmpty()) {
            return;
        }
        List<Nation> nations = nationRepository.findAllByCampaignIdOrderByNameAsc(campaignId);
        for (Nation nation : nations) {
            String homelandTerritoryKey = homelandsByNation.get(nation.getNationKey());
            if (homelandTerritoryKey == null) {
                continue;
            }
            ObjectNode metadata = readObject(nation.getMetadataJson());
            writeText(metadata, "homelandTerritoryKey", homelandTerritoryKey);
            nation.setMetadataJson(writeJson(metadata));
            nationRepository.save(nation);
        }
    }

    private void applyNationState(Nation nation, SaveCampaignNationStateRequest request) {
        ObjectNode metadata = readObject(nation.getMetadataJson());
        ObjectNode commandState = metadata.with("commandState");

        if (request.supplies() != null) {
            commandState.put("supplies", request.supplies());
        }
        if (request.manpower() != null) {
            commandState.put("manpower", request.manpower());
        }
        if (request.resourcePoints() != null) {
            commandState.put("resourcePoints", request.resourcePoints());
        }
        if (request.economyPool() != null) {
            commandState.set("economyPool", objectMapper.valueToTree(request.economyPool()));
        }
        if (request.researchState() != null) {
            commandState.set("researchState", objectMapper.valueToTree(request.researchState()));
        }
        if (request.doctrineState() != null) {
            commandState.set("doctrineState", objectMapper.valueToTree(request.doctrineState()));
        }
        if (request.upgradesState() != null) {
            commandState.set("upgradesState", objectMapper.valueToTree(request.upgradesState()));
        }

        nation.setMetadataJson(writeJson(metadata));
        nationRepository.save(nation);
    }

    private Set<String> resolveAllowedNationKeys(CampaignMember membership, List<Nation> nations) {
        if (membership.getRole() == CampaignRole.GM) {
            return nations.stream()
                    .map(Nation::getNationKey)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }
        if (membership.getNation() == null) {
            return Set.of();
        }
        return Set.of(membership.getNation().getNationKey());
    }

    private CampaignBridgeCustomFactionResponse toCustomFactionResponse(Faction faction) {
        return new CampaignBridgeCustomFactionResponse(
                stripCustomPrefix(faction.getFactionKey()),
                faction.getFactionKey(),
                faction.getName(),
                faction.getColor()
        );
    }

    private CampaignBridgeCustomNationResponse toCustomNationResponse(Nation nation) {
        ObjectNode metadata = readObject(nation.getMetadataJson());
        String defaultFactionKey = readText(metadata, "defaultFactionKey");
        if (defaultFactionKey == null) {
            defaultFactionKey = nation.getFaction() != null ? nation.getFaction().getFactionKey() : "neutral";
        }
        return new CampaignBridgeCustomNationResponse(
                nation.getNationKey(),
                nation.getName(),
                defaultFactionKey,
                readText(metadata, "color")
        );
    }

    private CampaignNationStateResponse toNationStateResponse(Nation nation) {
        ObjectNode metadata = readObject(nation.getMetadataJson());
        JsonNode commandState = metadata.path("commandState");
        return new CampaignNationStateResponse(
                nation.getNationKey(),
                commandState.path("supplies").asInt(0),
                commandState.path("manpower").asInt(0),
                commandState.path("resourcePoints").asInt(0),
                readEconomyPool(commandState.path("economyPool")),
                objectOrNull(commandState.get("researchState")),
                objectOrNull(commandState.get("doctrineState")),
                objectOrNull(commandState.get("upgradesState"))
        );
    }

    private void validateNationStateWriteAccess(CampaignMember membership, Nation nation) {
        if (membership.getRole() == CampaignRole.GM) {
            return;
        }
        if (membership.getRole() != CampaignRole.PLAYER
                || membership.getNation() == null
                || !membership.getNation().getNationKey().equals(nation.getNationKey())) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "Nation command-state updates are limited to your assigned nation");
        }
    }

    private Faction resolveNationFaction(boolean useDefaultFactions,
                                         String requestedFactionKey,
                                         Map<String, Faction> factionsByKey) {
        if (!useDefaultFactions || requestedFactionKey == null || requestedFactionKey.isBlank() || "neutral".equals(requestedFactionKey)) {
            return null;
        }
        return factionsByKey.get(requestedFactionKey);
    }

    private Faction newFaction(Campaign campaign, String key, String name, String color) {
        Faction faction = new Faction();
        faction.setCampaign(campaign);
        faction.setFactionKey(key);
        faction.setName(name);
        faction.setColor(color);
        faction.setType(FactionType.MAJOR);
        faction.setPlayerControlled(true);
        return faction;
    }

    private void writeAudit(CampaignMember membership,
                            String actionType,
                            String entityType,
                            UUID entityId,
                            Object before,
                            Object after) {
        CampaignAuditLog auditLog = new CampaignAuditLog();
        auditLog.setCampaign(membership.getCampaign());
        auditLog.setActorType(AuditActorType.USER);
        auditLog.setActorUser(membership.getUser());
        auditLog.setActorMember(membership);
        auditLog.setActionType(actionType);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setBeforeJson(writeObject(before));
        auditLog.setAfterJson(writeObject(after));
        campaignAuditLogRepository.save(auditLog);
    }

    private CampaignMember requireMembership(UUID campaignId, UUID userId) {
        return campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    private void requireGm(CampaignMember membership) {
        if (membership.getRole() != CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required");
        }
    }

    private boolean isCustomKey(String key) {
        return key != null && key.startsWith("custom:");
    }

    private String toCustomKey(String id) {
        return isCustomKey(id) ? id : "custom:" + id;
    }

    private String stripCustomPrefix(String key) {
        return isCustomKey(key) ? key.substring("custom:".length()) : key;
    }

    private String safeName(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    private ObjectNode readObject(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            JsonNode parsed = objectMapper.readTree(rawJson);
            return parsed != null && parsed.isObject() ? (ObjectNode) parsed : objectMapper.createObjectNode();
        } catch (JsonProcessingException exception) {
            throw new ApiException("CAMPAIGN_METADATA_INVALID", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse campaign bridge metadata");
        }
    }

    private Map<String, Boolean> readBooleanMap(JsonNode node) {
        Map<String, Boolean> values = new LinkedHashMap<>();
        if (node == null || !node.isObject()) {
            return values;
        }
        node.fields().forEachRemaining(entry -> values.put(entry.getKey(), entry.getValue().asBoolean(false)));
        return values;
    }

    private Map<String, Integer> readEconomyPool(JsonNode node) {
        if (node == null || !node.isObject()) {
            return Map.of(
                    "industry", 0,
                    "political", 0,
                    "logistics", 0,
                    "intelligence", 0
            );
        }
        return objectMapper.convertValue(node, new TypeReference<>() {
        });
    }

    private Object objectOrNull(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        return objectMapper.convertValue(node, Object.class);
    }

    private String readText(ObjectNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        if (field == null || field.isNull() || field.asText().isBlank()) {
            return null;
        }
        return field.asText();
    }

    private void writeText(ObjectNode node, String fieldName, String value) {
        if (value == null || value.isBlank()) {
            node.remove(fieldName);
            return;
        }
        node.put(fieldName, value.trim());
    }

    private String writeJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException exception) {
            throw new ApiException("CAMPAIGN_METADATA_INVALID", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize campaign bridge metadata");
        }
    }

    private String writeObject(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new ApiException("CAMPAIGN_METADATA_INVALID", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize audit payload");
        }
    }

    private record BaseNationTemplate(String name, String defaultFactionKey) {
    }
}
