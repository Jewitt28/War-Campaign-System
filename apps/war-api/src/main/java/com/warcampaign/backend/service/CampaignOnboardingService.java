package com.warcampaign.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.warcampaign.backend.domain.enums.AuditActorType;
import com.warcampaign.backend.domain.enums.CampaignMemberActivationStatus;
import com.warcampaign.backend.domain.enums.CampaignMemberOnboardingStatus;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignAuditLog;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.CampaignMemberOnboarding;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.TerritoryState;
import com.warcampaign.backend.domain.model.Theatre;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.dto.CampaignMemberOnboardingResponse;
import com.warcampaign.backend.dto.CampaignOnboardingResponse;
import com.warcampaign.backend.dto.CompleteOnboardingResponse;
import com.warcampaign.backend.dto.CompleteOnboardingTutorialRequest;
import com.warcampaign.backend.dto.OnboardingHomelandOptionResponse;
import com.warcampaign.backend.dto.OnboardingOptionResponse;
import com.warcampaign.backend.dto.OnboardingPolicyResponse;
import com.warcampaign.backend.dto.SelectOnboardingFactionRequest;
import com.warcampaign.backend.dto.SelectOnboardingHomelandRequest;
import com.warcampaign.backend.dto.SelectOnboardingNationRequest;
import com.warcampaign.backend.dto.UpdateOnboardingPolicyRequest;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignAuditLogRepository;
import com.warcampaign.backend.repository.CampaignMemberOnboardingRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
import com.warcampaign.backend.repository.PlatoonRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TerritoryRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class CampaignOnboardingService {

    private static final String TUTORIAL_VERSION = "player_onboarding_v1";
    private static final Pattern SLUG_SEPARATOR = Pattern.compile("[^a-z0-9]+");
    private static final Map<String, List<String>> BASE_HOMELAND_KEYS = Map.ofEntries(
            Map.entry("belgium", List.of("WE-07")),
            Map.entry("bulgaria", List.of("EE-14")),
            Map.entry("finland", List.of("EE-01")),
            Map.entry("france", List.of("WE-04", "WE-05", "WE-06")),
            Map.entry("germany", List.of("WE-08", "WE-09")),
            Map.entry("great_britain", List.of("WE-01", "WE-02")),
            Map.entry("greece", List.of("EE-15")),
            Map.entry("hungary", List.of("EE-15")),
            Map.entry("imperial_japan", List.of("PA-01", "PA-02")),
            Map.entry("italy", List.of("WE-10", "WE-11")),
            Map.entry("norway", List.of("WE-15")),
            Map.entry("partisans", List.of("EE-15", "WE-06", "EE-09")),
            Map.entry("poland", List.of("EE-07", "EE-08")),
            Map.entry("polish_peoples_army", List.of("EE-07", "EE-08")),
            Map.entry("romania", List.of("EE-14")),
            Map.entry("soviet_union", List.of("EE-05")),
            Map.entry("the_netherlands", List.of("WE-07")),
            Map.entry("us", List.of("NA-15"))
    );
    private static final Map<String, List<String>> FALLBACK_HOMELAND_KEYS_BY_FACTION = Map.of(
            "allies", List.of("WE-01", "WE-02", "WE-03", "WE-04", "WE-05", "WE-06", "WE-07", "WE-13", "WE-15", "NA-01", "NA-02", "NA-03", "NA-04", "NA-05"),
            "axis", List.of("WE-08", "WE-09", "WE-10", "WE-11", "WE-12", "NA-06", "NA-07", "NA-08", "NA-09", "NA-10", "NA-11", "NA-12"),
            "ussr", List.of("EE-03", "EE-04", "EE-05", "EE-06", "EE-07", "EE-08", "EE-09", "EE-10", "EE-11", "EE-12", "EE-13", "EE-14", "EE-15")
    );

    private final CampaignMemberRepository campaignMemberRepository;
    private final CampaignMemberOnboardingRepository campaignMemberOnboardingRepository;
    private final FactionRepository factionRepository;
    private final NationRepository nationRepository;
    private final TerritoryRepository territoryRepository;
    private final TerritoryStateRepository territoryStateRepository;
    private final TurnRepository turnRepository;
    private final PlatoonRepository platoonRepository;
    private final PlatoonStateRepository platoonStateRepository;
    private final CampaignAuditLogRepository campaignAuditLogRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public CampaignOnboardingService(CampaignMemberRepository campaignMemberRepository,
                                     CampaignMemberOnboardingRepository campaignMemberOnboardingRepository,
                                     FactionRepository factionRepository,
                                     NationRepository nationRepository,
                                     TerritoryRepository territoryRepository,
                                     TerritoryStateRepository territoryStateRepository,
                                     TurnRepository turnRepository,
                                     PlatoonRepository platoonRepository,
                                     PlatoonStateRepository platoonStateRepository,
                                     CampaignAuditLogRepository campaignAuditLogRepository,
                                     NotificationService notificationService,
                                     ObjectMapper objectMapper) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.campaignMemberOnboardingRepository = campaignMemberOnboardingRepository;
        this.factionRepository = factionRepository;
        this.nationRepository = nationRepository;
        this.territoryRepository = territoryRepository;
        this.territoryStateRepository = territoryStateRepository;
        this.turnRepository = turnRepository;
        this.platoonRepository = platoonRepository;
        this.platoonStateRepository = platoonStateRepository;
        this.campaignAuditLogRepository = campaignAuditLogRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public CampaignOnboardingResponse getOnboarding(UUID campaignId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requirePlayerMembership(campaignId, authenticatedUser.id());
        CampaignMemberOnboarding onboarding = ensureAccessibleOnboarding(membership);
        return toResponse(membership, onboarding);
    }

    @Transactional(readOnly = true)
    public OnboardingPolicyResponse getPolicy(UUID campaignId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, authenticatedUser.id())
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
        return toPolicyResponse(readPolicy(membership.getCampaign()));
    }

    @Transactional
    public CampaignOnboardingResponse selectFaction(UUID campaignId,
                                                    SelectOnboardingFactionRequest request,
                                                    AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requirePlayerMembership(campaignId, authenticatedUser.id());
        CampaignMemberOnboarding onboarding = ensureEditableOnboarding(membership);
        OnboardingSnapshot before = snapshot(onboarding);
        OnboardingPolicy policy = readPolicy(membership.getCampaign());

        Faction selectedFaction;
        if (request != null && request.factionId() != null) {
            selectedFaction = factionRepository.findByIdAndCampaignId(request.factionId(), campaignId)
                    .filter(Faction::isPlayerControlled)
                    .orElseThrow(() -> new ApiException("ONBOARDING_FACTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Faction not available for onboarding"));
        } else {
            if (!policy.allowPlayerCreatedFactions()) {
                throw new ApiException("ONBOARDING_CUSTOM_FACTION_DISABLED", HttpStatus.UNPROCESSABLE_ENTITY, "Player-created factions are disabled for this campaign");
            }
            String customFactionName = requireText(request != null ? request.customFactionName() : null,
                    "ONBOARDING_FACTION_INVALID",
                    "Custom faction name is required");
            selectedFaction = createCustomFaction(membership.getCampaign(), customFactionName, request != null ? request.customFactionColor() : null);
        }

        onboarding.setSelectedFaction(selectedFaction);
        if (onboarding.getSelectedNation() != null && onboarding.getSelectedNation().getFaction() != null
                && !onboarding.getSelectedNation().getFaction().getId().equals(selectedFaction.getId())) {
            onboarding.setSelectedNation(null);
            onboarding.setSelectedHomelandTerritory(null);
        }
        onboarding.setStatus(resolveProgressStatus(onboarding));
        campaignMemberOnboardingRepository.save(onboarding);
        writeAudit(membership, "ONBOARDING_FACTION_SELECTED", onboarding.getId(), before, snapshot(onboarding));
        return toResponse(membership, onboarding);
    }

    @Transactional
    public CampaignOnboardingResponse selectNation(UUID campaignId,
                                                   SelectOnboardingNationRequest request,
                                                   AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requirePlayerMembership(campaignId, authenticatedUser.id());
        CampaignMemberOnboarding onboarding = ensureEditableOnboarding(membership);
        OnboardingSnapshot before = snapshot(onboarding);
        OnboardingPolicy policy = readPolicy(membership.getCampaign());

        Faction selectedFaction = onboarding.getSelectedFaction();
        if (selectedFaction == null) {
            throw new ApiException("ONBOARDING_FACTION_REQUIRED", HttpStatus.UNPROCESSABLE_ENTITY, "Choose a faction before selecting a nation");
        }

        Nation selectedNation;
        if (request != null && request.nationId() != null) {
            selectedNation = nationRepository.findByIdAndCampaignId(request.nationId(), campaignId)
                    .orElseThrow(() -> new ApiException("ONBOARDING_NATION_NOT_FOUND", HttpStatus.NOT_FOUND, "Nation not available for onboarding"));
            if (selectedNation.getFaction() == null || !selectedFaction.getId().equals(selectedNation.getFaction().getId())) {
                throw new ApiException("ONBOARDING_NATION_INVALID", HttpStatus.UNPROCESSABLE_ENTITY, "Nation does not belong to the selected faction");
            }
            ensureNationClaimable(selectedNation, onboarding);
        } else {
            if (!policy.allowCustomNationCreation()) {
                throw new ApiException("ONBOARDING_CUSTOM_NATION_DISABLED", HttpStatus.UNPROCESSABLE_ENTITY, "Custom nations are disabled for this campaign");
            }
            String customNationName = requireText(request != null ? request.customNationName() : null,
                    "ONBOARDING_NATION_INVALID",
                    "Custom nation name is required");
            selectedNation = createCustomNation(membership.getCampaign(), selectedFaction, customNationName, request != null ? request.customNationColor() : null);
        }

        onboarding.setSelectedNation(selectedNation);
        onboarding.setSelectedHomelandTerritory(null);
        onboarding.setStatus(resolveProgressStatus(onboarding));
        campaignMemberOnboardingRepository.save(onboarding);
        writeAudit(membership, "ONBOARDING_NATION_SELECTED", onboarding.getId(), before, snapshot(onboarding));
        return toResponse(membership, onboarding);
    }

    @Transactional
    public CampaignOnboardingResponse selectHomeland(UUID campaignId,
                                                     SelectOnboardingHomelandRequest request,
                                                     AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requirePlayerMembership(campaignId, authenticatedUser.id());
        CampaignMemberOnboarding onboarding = ensureEditableOnboarding(membership);
        OnboardingSnapshot before = snapshot(onboarding);
        if (request == null || request.territoryId() == null) {
            throw new ApiException("ONBOARDING_HOMELAND_INVALID", HttpStatus.BAD_REQUEST, "Homeland territory is required");
        }

        Territory territory = territoryRepository.findByIdAndCampaignId(request.territoryId(), campaignId)
                .orElseThrow(() -> new ApiException("ONBOARDING_HOMELAND_NOT_FOUND", HttpStatus.NOT_FOUND, "Homeland territory not found"));

        Set<UUID> eligibleHomelandIds = resolveEligibleHomelands(membership, onboarding).stream()
                .map(Territory::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!eligibleHomelandIds.contains(territory.getId())) {
            throw new ApiException("ONBOARDING_HOMELAND_INVALID", HttpStatus.CONFLICT, "Homeland territory is no longer eligible");
        }

        onboarding.setSelectedHomelandTerritory(territory);
        onboarding.setStatus(resolveProgressStatus(onboarding));
        campaignMemberOnboardingRepository.save(onboarding);
        writeAudit(membership, "ONBOARDING_HOMELAND_SELECTED", onboarding.getId(), before, snapshot(onboarding));
        return toResponse(membership, onboarding);
    }

    @Transactional
    public CompleteOnboardingResponse completeOnboarding(UUID campaignId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requirePlayerMembership(campaignId, authenticatedUser.id());
        CampaignMemberOnboarding onboarding = ensureEditableOnboarding(membership);
        if (onboarding.getSelectedFaction() == null || onboarding.getSelectedNation() == null || onboarding.getSelectedHomelandTerritory() == null) {
            throw new ApiException("ONBOARDING_INCOMPLETE", HttpStatus.UNPROCESSABLE_ENTITY, "Faction, nation, and homeland must be selected before completing onboarding");
        }

        OnboardingSnapshot before = snapshot(onboarding);
        Campaign campaign = membership.getCampaign();
        OnboardingPolicy policy = readPolicy(campaign);
        boolean immediateActivation = campaign.getCurrentPhase() == com.warcampaign.backend.domain.enums.CampaignPhase.LOBBY
                || policy.allowImmediateActivation();

        membership.setFaction(onboarding.getSelectedFaction());
        membership.setNation(onboarding.getSelectedNation());
        campaignMemberRepository.save(membership);

        onboarding.setStatus(CampaignMemberOnboardingStatus.COMPLETE);
        if (immediateActivation) {
            Turn currentTurn = requireCurrentTurn(campaign);
            applyActivationPackage(onboarding, currentTurn);
            onboarding.setActivationStatus(CampaignMemberActivationStatus.ACTIVE);
            onboarding.setActivationTurnNumber(null);
        } else {
            onboarding.setActivationStatus(CampaignMemberActivationStatus.PENDING_NEXT_TURN);
            onboarding.setActivationTurnNumber(campaign.getCurrentTurnNumber() + 1);
        }
        CampaignMemberOnboarding savedOnboarding = campaignMemberOnboardingRepository.save(onboarding);
        writeAudit(membership, "ONBOARDING_COMPLETED", savedOnboarding.getId(), before, snapshot(savedOnboarding));

        String redirectPath = savedOnboarding.getActivationStatus() == CampaignMemberActivationStatus.PENDING_NEXT_TURN
                ? "/app/campaigns/" + campaignId + "/waiting?tour=" + TUTORIAL_VERSION
                : "/app/campaigns/" + campaignId + "/dashboard?tour=" + TUTORIAL_VERSION;

        return new CompleteOnboardingResponse(
                campaignId,
                membership.getId(),
                savedOnboarding.getStatus(),
                savedOnboarding.getActivationStatus(),
                savedOnboarding.getActivationTurnNumber(),
                redirectPath,
                starterPlatoonName(savedOnboarding.getSelectedNation())
        );
    }

    @Transactional
    public CampaignMemberOnboardingResponse completeTutorial(UUID campaignId,
                                                            CompleteOnboardingTutorialRequest request,
                                                            AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requirePlayerMembership(campaignId, authenticatedUser.id());
        CampaignMemberOnboarding onboarding = ensureAccessibleOnboarding(membership);
        onboarding.setTutorialCompletedAt(Instant.now());
        onboarding.setTutorialVersion(normalizeTutorialVersion(request != null ? request.tutorialVersion() : null));
        campaignMemberOnboardingRepository.save(onboarding);
        writeAudit(membership, "ONBOARDING_TUTORIAL_COMPLETED", onboarding.getId(), null, snapshot(onboarding));
        return toMemberOnboardingResponse(onboarding);
    }

    @Transactional
    public OnboardingPolicyResponse updatePolicy(UUID campaignId,
                                                 UpdateOnboardingPolicyRequest request,
                                                 AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireGmMembership(campaignId, authenticatedUser.id());
        Campaign campaign = membership.getCampaign();
        OnboardingPolicy current = readPolicy(campaign);
        ObjectNode metadata = readObject(campaign.getMetadataJson());
        ObjectNode onboarding = metadata.with("onboarding");

        onboarding.put(
                "allowCustomNationCreation",
                request != null && request.allowCustomNationCreation() != null
                        ? request.allowCustomNationCreation()
                        : current.allowCustomNationCreation()
        );
        onboarding.put(
                "allowPlayerCreatedFactions",
                request != null && request.allowPlayerCreatedFactions() != null
                        ? request.allowPlayerCreatedFactions()
                        : current.allowPlayerCreatedFactions()
        );
        onboarding.put(
                "allowImmediateActivation",
                request != null && request.allowImmediateActivation() != null
                        ? request.allowImmediateActivation()
                        : current.allowImmediateActivation()
        );

        campaign.setMetadataJson(writeObject(metadata));
        return toPolicyResponse(readPolicy(campaign));
    }

    @Transactional
    public CampaignMemberOnboarding ensureInviteAcceptanceState(CampaignMember membership) {
        CampaignMemberOnboarding onboarding = campaignMemberOnboardingRepository.findByMembershipId(membership.getId())
                .orElseGet(() -> {
                    CampaignMemberOnboarding created = new CampaignMemberOnboarding();
                    created.setMembership(membership);
                    return created;
                });

        hydrateSelectionsFromMembership(onboarding, membership);
        if (membership.getRole() != CampaignRole.PLAYER) {
            onboarding.setStatus(CampaignMemberOnboardingStatus.NOT_REQUIRED);
            onboarding.setActivationStatus(CampaignMemberActivationStatus.ACTIVE);
            onboarding.setActivationTurnNumber(null);
        } else if (membership.getRole() == CampaignRole.PLAYER && onboarding.getStatus() != CampaignMemberOnboardingStatus.COMPLETE) {
            onboarding.setStatus(resolveProgressStatus(onboarding));
            onboarding.setActivationStatus(CampaignMemberActivationStatus.ACTIVE);
            onboarding.setActivationTurnNumber(null);
        }

        return campaignMemberOnboardingRepository.save(onboarding);
    }

    @Transactional(readOnly = true)
    public CampaignMemberOnboardingResponse getMemberOnboardingSummary(CampaignMember membership) {
        CampaignMemberOnboarding onboarding = ensureAccessibleOnboarding(membership);
        return toMemberOnboardingResponse(onboarding);
    }

    @Transactional(readOnly = true)
    public boolean isPendingActivation(CampaignMember membership) {
        CampaignMemberOnboarding onboarding = campaignMemberOnboardingRepository.findByMembershipId(membership.getId()).orElse(null);
        return onboarding != null && onboarding.getActivationStatus() == CampaignMemberActivationStatus.PENDING_NEXT_TURN;
    }

    @Transactional
    public void activatePendingMembersForTurn(Campaign campaign, Turn activeTurn) {
        List<CampaignMemberOnboarding> pendingOnboardings =
                campaignMemberOnboardingRepository.findAllByMembershipCampaignIdAndActivationStatusAndActivationTurnNumber(
                        campaign.getId(),
                        CampaignMemberActivationStatus.PENDING_NEXT_TURN,
                        activeTurn.getTurnNumber()
                );

        for (CampaignMemberOnboarding onboarding : pendingOnboardings) {
            CampaignMember membership = onboarding.getMembership();
            OnboardingSnapshot before = snapshot(onboarding);
            applyActivationPackage(onboarding, activeTurn);
            onboarding.setActivationStatus(CampaignMemberActivationStatus.ACTIVE);
            onboarding.setActivationTurnNumber(null);
            campaignMemberOnboardingRepository.save(onboarding);
            writeAudit(membership, "ONBOARDING_ACTIVATED", onboarding.getId(), before, snapshot(onboarding));
            notificationService.notifyUser(
                    campaign,
                    membership.getUser(),
                    "ONBOARDING_ACTIVATED",
                    "Campaign activation complete",
                    "Your onboarding for " + campaign.getName() + " is now active for turn " + activeTurn.getTurnNumber() + ".",
                    "{\"campaignId\":\"" + campaign.getId() + "\",\"turnNumber\":" + activeTurn.getTurnNumber() + "}"
            );
        }
    }

    private CampaignMemberOnboarding ensureAccessibleOnboarding(CampaignMember membership) {
        CampaignMemberOnboarding onboarding = campaignMemberOnboardingRepository.findByMembershipId(membership.getId())
                .orElseGet(() -> ensureInviteAcceptanceState(membership));
        hydrateSelectionsFromMembership(onboarding, membership);
        return onboarding;
    }

    private CampaignMemberOnboarding ensureEditableOnboarding(CampaignMember membership) {
        CampaignMemberOnboarding onboarding = ensureAccessibleOnboarding(membership);
        if (membership.getRole() != CampaignRole.PLAYER) {
            throw new ApiException("ONBOARDING_NOT_REQUIRED", HttpStatus.FORBIDDEN, "Only player memberships use onboarding");
        }
        if (onboarding.getStatus() == CampaignMemberOnboardingStatus.COMPLETE) {
            throw new ApiException("ONBOARDING_ALREADY_COMPLETE", HttpStatus.CONFLICT, "Onboarding is already complete");
        }
        return onboarding;
    }

    private CampaignMember requirePlayerMembership(UUID campaignId, UUID userId) {
        CampaignMember membership = campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
        if (membership.getRole() != CampaignRole.PLAYER) {
            throw new ApiException("ONBOARDING_NOT_REQUIRED", HttpStatus.FORBIDDEN, "Only player memberships use onboarding");
        }
        return membership;
    }

    private CampaignMember requireGmMembership(UUID campaignId, UUID userId) {
        CampaignMember membership = campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
        if (membership.getRole() != CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required for onboarding policy changes");
        }
        return membership;
    }

    private void hydrateSelectionsFromMembership(CampaignMemberOnboarding onboarding, CampaignMember membership) {
        if (onboarding.getSelectedFaction() == null) {
            onboarding.setSelectedFaction(membership.getFaction());
        }
        if (onboarding.getSelectedNation() == null) {
            onboarding.setSelectedNation(membership.getNation());
        }
        if (onboarding.getSelectedHomelandTerritory() == null && membership.getNation() != null) {
            String homelandTerritoryKey = readText(readObject(membership.getNation().getMetadataJson()), "homelandTerritoryKey");
            if (homelandTerritoryKey != null) {
                territoryRepository.findByCampaignIdAndTerritoryKey(membership.getCampaign().getId(), homelandTerritoryKey)
                        .ifPresent(onboarding::setSelectedHomelandTerritory);
            }
        }
    }

    private CampaignOnboardingResponse toResponse(CampaignMember membership, CampaignMemberOnboarding onboarding) {
        List<Faction> eligibleFactions = factionRepository.findAllByCampaignIdOrderByNameAsc(membership.getCampaign().getId()).stream()
                .filter(Faction::isPlayerControlled)
                .sorted(Comparator.comparing(Faction::getName))
                .toList();
        List<Nation> eligibleNations = resolveEligibleNations(membership, onboarding);
        List<Territory> eligibleHomelands = resolveEligibleHomelands(membership, onboarding);

        return new CampaignOnboardingResponse(
                membership.getCampaign().getId(),
                membership.getId(),
                onboarding.getStatus(),
                onboarding.getActivationStatus(),
                onboarding.getActivationTurnNumber(),
                resolveNextStep(onboarding),
                toPolicyResponse(readPolicy(membership.getCampaign())),
                onboarding.getSelectedFaction() != null ? toFactionOption(onboarding.getSelectedFaction()) : null,
                onboarding.getSelectedNation() != null ? toNationOption(onboarding.getSelectedNation()) : null,
                onboarding.getSelectedHomelandTerritory() != null ? toHomelandOption(onboarding.getSelectedHomelandTerritory()) : null,
                eligibleFactions.stream().map(this::toFactionOption).toList(),
                eligibleNations.stream().map(this::toNationOption).toList(),
                eligibleHomelands.stream().map(this::toHomelandOption).toList(),
                starterPlatoonName(onboarding.getSelectedNation()),
                onboarding.getTutorialCompletedAt(),
                onboarding.getTutorialVersion()
        );
    }

    private List<Nation> resolveEligibleNations(CampaignMember membership, CampaignMemberOnboarding onboarding) {
        List<Nation> nations = nationRepository.findAllByCampaignIdOrderByNameAsc(membership.getCampaign().getId());
        Set<UUID> reservedNationIds = reservedNationIds(membership.getCampaign().getId(), membership.getId());
        Faction selectedFaction = onboarding.getSelectedFaction();
        return nations.stream()
                .filter(nation -> !nation.isNpc())
                .filter(nation -> selectedFaction == null || (nation.getFaction() != null && nation.getFaction().getId().equals(selectedFaction.getId())))
                .filter(nation -> onboarding.getSelectedNation() != null && nation.getId().equals(onboarding.getSelectedNation().getId())
                        || isNationUnclaimed(nation.getId(), membership.getCampaign().getId(), reservedNationIds))
                .sorted(Comparator.comparing(Nation::getName))
                .toList();
    }

    private List<Territory> resolveEligibleHomelands(CampaignMember membership, CampaignMemberOnboarding onboarding) {
        Nation nation = onboarding.getSelectedNation();
        if (nation == null) {
            return List.of();
        }

        Campaign campaign = membership.getCampaign();
        Turn currentTurn = requireCurrentTurn(campaign);
        List<Territory> territories = territoryRepository.findAllByCampaignIdOrderByNameAsc(campaign.getId());
        Map<UUID, TerritoryState> territoryStateByTerritoryId = territoryStateRepository
                .findAllByCampaignIdAndTurnNumber(campaign.getId(), currentTurn.getTurnNumber())
                .stream()
                .collect(Collectors.toMap(state -> state.getTerritory().getId(), state -> state, (left, right) -> right, LinkedHashMap::new));
        Set<UUID> reservedHomelandIds = reservedHomelandIds(campaign.getId(), membership.getId());
        List<String> preferredTerritoryKeys = resolvePreferredHomelandKeys(nation, onboarding.getSelectedFaction());

        List<Territory> eligible = territories.stream()
                .filter(territory -> onboarding.getSelectedHomelandTerritory() != null && territory.getId().equals(onboarding.getSelectedHomelandTerritory().getId())
                        || isHomelandUnclaimed(territory, territoryStateByTerritoryId.get(territory.getId()), reservedHomelandIds))
                .toList();

        List<Territory> preferred = eligible.stream()
                .filter(territory -> preferredTerritoryKeys.contains(territory.getTerritoryKey()))
                .toList();

        return (preferred.isEmpty() ? eligible : preferred).stream()
                .sorted(Comparator.comparing(Territory::getName))
                .toList();
    }

    private void ensureNationClaimable(Nation nation, CampaignMemberOnboarding onboarding) {
        Set<UUID> reservedNationIds = reservedNationIds(nation.getCampaign().getId(), onboarding.getMembership().getId());
        if (!isNationUnclaimed(nation.getId(), nation.getCampaign().getId(), reservedNationIds)) {
            throw new ApiException("ONBOARDING_NATION_UNAVAILABLE", HttpStatus.CONFLICT, "Nation is already claimed or reserved");
        }
    }

    private boolean isNationUnclaimed(UUID nationId, UUID campaignId, Set<UUID> reservedNationIds) {
        boolean assignedToMembership = campaignMemberRepository.findAllByCampaignIdWithUser(campaignId).stream()
                .anyMatch(member -> member.getNation() != null && nationId.equals(member.getNation().getId()));
        return !assignedToMembership && !reservedNationIds.contains(nationId);
    }

    private boolean isHomelandUnclaimed(Territory territory,
                                        TerritoryState territoryState,
                                        Set<UUID> reservedHomelandIds) {
        boolean reserved = reservedHomelandIds.contains(territory.getId());
        boolean claimed = territoryState != null
                && (territoryState.getControllingFaction() != null || territoryState.getControllerNation() != null || territoryState.getStrategicStatus() != TerritoryStrategicStatus.NEUTRAL);
        return !reserved && !claimed;
    }

    private Set<UUID> reservedNationIds(UUID campaignId, UUID membershipId) {
        return campaignMemberOnboardingRepository.findAllByMembershipCampaignId(campaignId).stream()
                .filter(onboarding -> !onboarding.getMembership().getId().equals(membershipId))
                .map(CampaignMemberOnboarding::getSelectedNation)
                .filter(Objects::nonNull)
                .map(Nation::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<UUID> reservedHomelandIds(UUID campaignId, UUID membershipId) {
        return campaignMemberOnboardingRepository.findAllByMembershipCampaignId(campaignId).stream()
                .filter(onboarding -> !onboarding.getMembership().getId().equals(membershipId))
                .map(CampaignMemberOnboarding::getSelectedHomelandTerritory)
                .filter(Objects::nonNull)
                .map(Territory::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<String> resolvePreferredHomelandKeys(Nation nation, Faction faction) {
        List<String> preferred = new ArrayList<>(BASE_HOMELAND_KEYS.getOrDefault(nation.getNationKey(), List.of()));
        if (preferred.isEmpty() && faction != null) {
            preferred.addAll(FALLBACK_HOMELAND_KEYS_BY_FACTION.getOrDefault(faction.getFactionKey(), List.of()));
        }
        return preferred;
    }

    private CompleteOnboardingResponse buildCompleteResponse(CampaignMember membership, CampaignMemberOnboarding onboarding) {
        String redirectPath = onboarding.getActivationStatus() == CampaignMemberActivationStatus.PENDING_NEXT_TURN
                ? "/app/campaigns/" + membership.getCampaign().getId() + "/waiting?tour=" + TUTORIAL_VERSION
                : "/app/campaigns/" + membership.getCampaign().getId() + "/dashboard?tour=" + TUTORIAL_VERSION;
        return new CompleteOnboardingResponse(
                membership.getCampaign().getId(),
                membership.getId(),
                onboarding.getStatus(),
                onboarding.getActivationStatus(),
                onboarding.getActivationTurnNumber(),
                redirectPath,
                starterPlatoonName(onboarding.getSelectedNation())
        );
    }

    private Faction createCustomFaction(Campaign campaign, String name, String color) {
        String key = nextCustomKey(name, existingFactionKeys(campaign.getId()));
        Faction faction = new Faction();
        faction.setCampaign(campaign);
        faction.setFactionKey(key);
        faction.setName(name.trim());
        faction.setColor(normalizeColor(color));
        faction.setType(FactionType.MAJOR);
        faction.setPlayerControlled(true);
        return factionRepository.save(faction);
    }

    private Nation createCustomNation(Campaign campaign, Faction faction, String name, String color) {
        String key = nextCustomKey(name, existingNationKeys(campaign.getId()));
        Nation nation = new Nation();
        nation.setCampaign(campaign);
        nation.setFaction(faction);
        nation.setNationKey(key);
        nation.setName(name.trim());
        nation.setNpc(false);
        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("defaultFactionKey", faction.getFactionKey());
        if (normalizeColor(color) != null) {
            metadata.put("color", normalizeColor(color));
        }
        nation.setMetadataJson(writeObject(metadata));
        return nationRepository.save(nation);
    }

    private Set<String> existingFactionKeys(UUID campaignId) {
        return factionRepository.findAllByCampaignIdOrderByNameAsc(campaignId).stream()
                .map(Faction::getFactionKey)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<String> existingNationKeys(UUID campaignId) {
        return nationRepository.findAllByCampaignIdOrderByNameAsc(campaignId).stream()
                .map(Nation::getNationKey)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String nextCustomKey(String label, Collection<String> existingKeys) {
        String base = slugify(label);
        String candidate = "custom:" + base;
        int index = 2;
        while (existingKeys.contains(candidate)) {
            candidate = "custom:" + base + "-" + index;
            index++;
        }
        return candidate;
    }

    private String slugify(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        normalized = SLUG_SEPARATOR.matcher(normalized).replaceAll("-");
        normalized = normalized.replaceAll("^-+", "").replaceAll("-+$", "");
        return normalized.isBlank() ? "custom" : normalized;
    }

    private String normalizeColor(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private CampaignMemberOnboardingStatus resolveProgressStatus(CampaignMemberOnboarding onboarding) {
        if (onboarding.getSelectedFaction() == null || onboarding.getSelectedNation() == null || onboarding.getSelectedHomelandTerritory() == null) {
            return onboarding.getSelectedFaction() == null && onboarding.getSelectedNation() == null && onboarding.getSelectedHomelandTerritory() == null
                    ? CampaignMemberOnboardingStatus.REQUIRED
                    : CampaignMemberOnboardingStatus.IN_PROGRESS;
        }
        return CampaignMemberOnboardingStatus.IN_PROGRESS;
    }

    private String resolveNextStep(CampaignMemberOnboarding onboarding) {
        if (onboarding.getStatus() == CampaignMemberOnboardingStatus.NOT_REQUIRED) {
            return "DONE";
        }
        if (onboarding.getStatus() == CampaignMemberOnboardingStatus.COMPLETE) {
            return onboarding.getActivationStatus() == CampaignMemberActivationStatus.PENDING_NEXT_TURN ? "WAITING" : "DONE";
        }
        if (onboarding.getSelectedFaction() == null) {
            return "FACTION";
        }
        if (onboarding.getSelectedNation() == null) {
            return "NATION";
        }
        if (onboarding.getSelectedHomelandTerritory() == null) {
            return "HOMELAND";
        }
        return "CONFIRM";
    }

    private void applyActivationPackage(CampaignMemberOnboarding onboarding, Turn turn) {
        CampaignMember membership = onboarding.getMembership();
        Faction faction = requireNonNull(onboarding.getSelectedFaction(), "ONBOARDING_FACTION_REQUIRED", "Faction selection is required");
        Nation nation = requireNonNull(onboarding.getSelectedNation(), "ONBOARDING_NATION_REQUIRED", "Nation selection is required");
        Territory homeland = requireNonNull(onboarding.getSelectedHomelandTerritory(), "ONBOARDING_HOMELAND_REQUIRED", "Homeland selection is required");

        ObjectNode nationMetadata = readObject(nation.getMetadataJson());
        nationMetadata.put("homelandTerritoryKey", homeland.getTerritoryKey());
        nation.setMetadataJson(writeObject(nationMetadata));
        nationRepository.save(nation);

        TerritoryState territoryState = territoryStateRepository
                .findByTerritoryIdAndCampaignIdAndTurnNumber(homeland.getId(), membership.getCampaign().getId(), turn.getTurnNumber())
                .orElseGet(() -> {
                    TerritoryState created = new TerritoryState();
                    created.setTurn(turn);
                    created.setTerritory(homeland);
                    created.setStrategicStatus(TerritoryStrategicStatus.NEUTRAL);
                    created.setFortLevel(0);
                    created.setPartisanRisk(0);
                    created.setSupplyStatus("SUPPLIED");
                    return created;
                });
        territoryState.setControllingFaction(faction);
        territoryState.setControllerNation(nation);
        territoryState.setStrategicStatus(TerritoryStrategicStatus.CONTROLLED);
        territoryStateRepository.save(territoryState);

        String platoonKey = "starter-home-guard-" + membership.getId().toString().replace("-", "");
        if (platoonRepository.findByCampaignIdAndPlatoonKey(membership.getCampaign().getId(), platoonKey).isPresent()) {
            return;
        }

        Platoon platoon = new Platoon();
        platoon.setCampaign(membership.getCampaign());
        platoon.setFaction(faction);
        platoon.setNation(nation);
        platoon.setAssignedMember(membership);
        platoon.setHomeTerritory(homeland);
        platoon.setPlatoonKey(platoonKey);
        platoon.setName(starterPlatoonName(nation));
        platoon.setUnitType("LINE");
        platoon.setHiddenFromPlayers(false);
        platoon.setMetadataJson("{}");
        Platoon savedPlatoon = platoonRepository.save(platoon);

        PlatoonState state = new PlatoonState();
        state.setTurn(turn);
        state.setPlatoon(savedPlatoon);
        state.setTerritory(homeland);
        state.setName(savedPlatoon.getName());
        state.setReadinessStatus(PlatoonReadinessStatus.ACTIVE);
        state.setStrength(100);
        state.setHiddenFromPlayers(false);
        state.setNotes("Starter platoon created by onboarding");
        platoonStateRepository.save(state);
    }

    private String starterPlatoonName(Nation nation) {
        if (nation == null) {
            return "Home Guard";
        }
        return nation.getName() + " Home Guard";
    }

    private OnboardingPolicy readPolicy(Campaign campaign) {
        ObjectNode metadata = readObject(campaign.getMetadataJson());
        JsonNode onboarding = metadata.path("onboarding");
        return new OnboardingPolicy(
                onboarding.path("allowCustomNationCreation").asBoolean(false),
                onboarding.path("allowPlayerCreatedFactions").asBoolean(false),
                onboarding.path("allowImmediateActivation").asBoolean(false)
        );
    }

    public String applyDefaultOnboardingPolicy(String metadataJson) {
        ObjectNode metadata = readObject(metadataJson);
        ObjectNode onboarding = metadata.with("onboarding");
        if (!onboarding.has("allowCustomNationCreation")) {
            onboarding.put("allowCustomNationCreation", false);
        }
        if (!onboarding.has("allowPlayerCreatedFactions")) {
            onboarding.put("allowPlayerCreatedFactions", false);
        }
        if (!onboarding.has("allowImmediateActivation")) {
            onboarding.put("allowImmediateActivation", false);
        }
        return writeObject(metadata);
    }

    private OnboardingPolicyResponse toPolicyResponse(OnboardingPolicy policy) {
        return new OnboardingPolicyResponse(
                policy.allowCustomNationCreation(),
                policy.allowPlayerCreatedFactions(),
                policy.allowImmediateActivation()
        );
    }

    private OnboardingOptionResponse toFactionOption(Faction faction) {
        return new OnboardingOptionResponse(
                faction.getId(),
                faction.getFactionKey(),
                faction.getName(),
                faction.getId(),
                faction.getFactionKey(),
                faction.getColor(),
                isCustomKey(faction.getFactionKey())
        );
    }

    private OnboardingOptionResponse toNationOption(Nation nation) {
        return new OnboardingOptionResponse(
                nation.getId(),
                nation.getNationKey(),
                nation.getName(),
                nation.getFaction() != null ? nation.getFaction().getId() : null,
                nation.getFaction() != null ? nation.getFaction().getFactionKey() : null,
                readText(readObject(nation.getMetadataJson()), "color"),
                isCustomKey(nation.getNationKey())
        );
    }

    private OnboardingHomelandOptionResponse toHomelandOption(Territory territory) {
        Theatre theatre = territory.getTheatre();
        return new OnboardingHomelandOptionResponse(
                territory.getId(),
                territory.getTerritoryKey(),
                territory.getName(),
                theatre.getId(),
                theatre.getTheatreKey(),
                theatre.getName()
        );
    }

    private CampaignMemberOnboardingResponse toMemberOnboardingResponse(CampaignMemberOnboarding onboarding) {
        return new CampaignMemberOnboardingResponse(
                onboarding.getStatus(),
                onboarding.getActivationStatus(),
                onboarding.getActivationTurnNumber(),
                onboarding.getTutorialCompletedAt(),
                onboarding.getTutorialVersion()
        );
    }

    private Turn requireCurrentTurn(Campaign campaign) {
        return turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), campaign.getCurrentTurnNumber())
                .orElseThrow(() -> new ApiException("CAMPAIGN_TURN_NOT_FOUND", HttpStatus.NOT_FOUND, "Current campaign turn not found"));
    }

    private void writeAudit(CampaignMember membership,
                            String actionType,
                            UUID entityId,
                            OnboardingSnapshot before,
                            OnboardingSnapshot after) {
        CampaignAuditLog auditLog = new CampaignAuditLog();
        auditLog.setCampaign(membership.getCampaign());
        auditLog.setActorType(AuditActorType.USER);
        auditLog.setActorUser(membership.getUser());
        auditLog.setActorMember(membership);
        auditLog.setActionType(actionType);
        auditLog.setEntityType("CAMPAIGN_MEMBER_ONBOARDING");
        auditLog.setEntityId(entityId);
        auditLog.setBeforeJson(before != null ? writeObject(before) : null);
        auditLog.setAfterJson(after != null ? writeObject(after) : null);
        campaignAuditLogRepository.save(auditLog);
    }

    private OnboardingSnapshot snapshot(CampaignMemberOnboarding onboarding) {
        return new OnboardingSnapshot(
                onboarding.getStatus(),
                onboarding.getActivationStatus(),
                onboarding.getActivationTurnNumber(),
                onboarding.getSelectedFaction() != null ? onboarding.getSelectedFaction().getFactionKey() : null,
                onboarding.getSelectedNation() != null ? onboarding.getSelectedNation().getNationKey() : null,
                onboarding.getSelectedHomelandTerritory() != null ? onboarding.getSelectedHomelandTerritory().getTerritoryKey() : null,
                onboarding.getTutorialCompletedAt(),
                onboarding.getTutorialVersion()
        );
    }

    private <T> T requireNonNull(T value, String code, String message) {
        if (value == null) {
            throw new ApiException(code, HttpStatus.UNPROCESSABLE_ENTITY, message);
        }
        return value;
    }

    private String normalizeTutorialVersion(String requestedVersion) {
        if (requestedVersion == null || requestedVersion.isBlank()) {
            return TUTORIAL_VERSION;
        }
        return requestedVersion.trim();
    }

    private String requireText(String value, String code, String message) {
        if (value == null || value.trim().isBlank()) {
            throw new ApiException(code, HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private boolean isCustomKey(String key) {
        return key != null && key.startsWith("custom:");
    }

    private ObjectNode readObject(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            JsonNode parsed = objectMapper.readTree(rawJson);
            return parsed != null && parsed.isObject() ? (ObjectNode) parsed : objectMapper.createObjectNode();
        } catch (JsonProcessingException exception) {
            throw new ApiException("CAMPAIGN_METADATA_INVALID", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse onboarding metadata");
        }
    }

    private String writeObject(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new ApiException("CAMPAIGN_METADATA_INVALID", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize onboarding metadata");
        }
    }

    private String readText(ObjectNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }

    private record OnboardingPolicy(boolean allowCustomNationCreation,
                                    boolean allowPlayerCreatedFactions,
                                    boolean allowImmediateActivation) {
    }

    private record OnboardingSnapshot(CampaignMemberOnboardingStatus status,
                                      CampaignMemberActivationStatus activationStatus,
                                      Integer activationTurnNumber,
                                      String selectedFactionKey,
                                      String selectedNationKey,
                                      String selectedHomelandTerritoryKey,
                                      Instant tutorialCompletedAt,
                                      String tutorialVersion) {
    }
}
