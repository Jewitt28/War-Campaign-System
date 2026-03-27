package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.enums.InviteStatus;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignAuditLog;
import com.warcampaign.backend.domain.model.CampaignInvite;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.TerritoryState;
import com.warcampaign.backend.domain.model.Theatre;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.dto.BattleSummaryResponse;
import com.warcampaign.backend.dto.CampaignAuditLogResponse;
import com.warcampaign.backend.dto.CampaignInviteAdminResponse;
import com.warcampaign.backend.dto.CampaignLifecycleResponse;
import com.warcampaign.backend.dto.CampaignMemberResponse;
import com.warcampaign.backend.dto.CampaignSnapshotExportResponse;
import com.warcampaign.backend.dto.CreateCampaignInviteRequest;
import com.warcampaign.backend.dto.CreateCampaignRequest;
import com.warcampaign.backend.dto.MapTerritorySummaryResponse;
import com.warcampaign.backend.dto.PlayerPlatoonSummaryResponse;
import com.warcampaign.backend.dto.ResolutionEventResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignAuditLogRepository;
import com.warcampaign.backend.repository.CampaignInviteRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
import com.warcampaign.backend.repository.PlatoonRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TerritoryRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import com.warcampaign.backend.repository.TheatreRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.repository.UserRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class CampaignAdminService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final CampaignAuditLogRepository campaignAuditLogRepository;
    private final CampaignRepository campaignRepository;
    private final CampaignInviteRepository campaignInviteRepository;
    private final FactionRepository factionRepository;
    private final NationRepository nationRepository;
    private final TheatreRepository theatreRepository;
    private final TerritoryRepository territoryRepository;
    private final TerritoryStateRepository territoryStateRepository;
    private final TurnRepository turnRepository;
    private final PlatoonRepository platoonRepository;
    private final PlatoonStateRepository platoonStateRepository;
    private final UserRepository userRepository;
    private final CampaignLobbyService campaignLobbyService;
    private final CampaignMapService campaignMapService;
    private final CampaignPlatoonService campaignPlatoonService;
    private final CampaignResolutionService campaignResolutionService;
    private final boolean devAuthEnabled;

    public CampaignAdminService(CampaignMemberRepository campaignMemberRepository,
                                CampaignAuditLogRepository campaignAuditLogRepository,
                                CampaignRepository campaignRepository,
                                CampaignInviteRepository campaignInviteRepository,
                                FactionRepository factionRepository,
                                NationRepository nationRepository,
                                TheatreRepository theatreRepository,
                                TerritoryRepository territoryRepository,
                                TerritoryStateRepository territoryStateRepository,
                                TurnRepository turnRepository,
                                PlatoonRepository platoonRepository,
                                PlatoonStateRepository platoonStateRepository,
                                UserRepository userRepository,
                                CampaignLobbyService campaignLobbyService,
                                CampaignMapService campaignMapService,
                                CampaignPlatoonService campaignPlatoonService,
                                CampaignResolutionService campaignResolutionService,
                                @Value("${app.security.dev-auth.enabled:false}") boolean devAuthEnabled) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.campaignAuditLogRepository = campaignAuditLogRepository;
        this.campaignRepository = campaignRepository;
        this.campaignInviteRepository = campaignInviteRepository;
        this.factionRepository = factionRepository;
        this.nationRepository = nationRepository;
        this.theatreRepository = theatreRepository;
        this.territoryRepository = territoryRepository;
        this.territoryStateRepository = territoryStateRepository;
        this.turnRepository = turnRepository;
        this.platoonRepository = platoonRepository;
        this.platoonStateRepository = platoonStateRepository;
        this.userRepository = userRepository;
        this.campaignLobbyService = campaignLobbyService;
        this.campaignMapService = campaignMapService;
        this.campaignPlatoonService = campaignPlatoonService;
        this.campaignResolutionService = campaignResolutionService;
        this.devAuthEnabled = devAuthEnabled;
    }

    @Transactional
    public CampaignLifecycleResponse createCampaign(CreateCampaignRequest request, AuthenticatedUser authenticatedUser) {
        String name = request != null && request.name() != null ? request.name().trim() : "";
        if (name.isBlank()) {
            throw new ApiException("CAMPAIGN_NAME_REQUIRED", HttpStatus.BAD_REQUEST, "Campaign name is required");
        }

        User creator = userRepository.findById(authenticatedUser.id())
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.UNAUTHORIZED, "Authenticated user not found"));

        Campaign campaign = seedTemplateCampaign(name, creator);
        return toLifecycleResponse(campaign);
    }

    @Transactional(readOnly = true)
    public List<CampaignInviteAdminResponse> listInvites(UUID campaignId, AuthenticatedUser authenticatedUser) {
        requireGmMembership(campaignId, authenticatedUser.id());
        return campaignInviteRepository.findAllByCampaignIdOrderByExpiresAtDesc(campaignId).stream()
                .map(this::toInviteResponse)
                .toList();
    }

    @Transactional
    public CampaignInviteAdminResponse createInvite(UUID campaignId,
                                                    CreateCampaignInviteRequest request,
                                                    AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireGmMembership(campaignId, authenticatedUser.id());
        if (request == null || request.intendedRole() == null) {
            throw new ApiException("INVITE_INVALID", HttpStatus.BAD_REQUEST, "Invite payload and intended role are required");
        }

        String inviteeEmail = request.inviteeEmail() != null ? request.inviteeEmail().trim().toLowerCase(Locale.ROOT) : "";
        if (inviteeEmail.isBlank() || !inviteeEmail.contains("@")) {
            throw new ApiException("INVITE_EMAIL_INVALID", HttpStatus.BAD_REQUEST, "A valid invitee email is required");
        }

        int expiresInDays = request.expiresInDays() != null ? request.expiresInDays() : 7;
        if (expiresInDays < 1 || expiresInDays > 30) {
            throw new ApiException("INVITE_EXPIRY_INVALID", HttpStatus.BAD_REQUEST, "Invite expiry must be between 1 and 30 days");
        }

        CampaignInvite invite = new CampaignInvite();
        invite.setCampaign(membership.getCampaign());
        invite.setInvitedBy(membership.getUser());
        invite.setInviteeEmail(inviteeEmail);
        invite.setInviteToken(UUID.randomUUID().toString().replace("-", ""));
        invite.setIntendedRole(request.intendedRole());
        invite.setStatus(InviteStatus.PENDING);
        invite.setExpiresAt(Instant.now().plus(expiresInDays, ChronoUnit.DAYS));

        return toInviteResponse(campaignInviteRepository.save(invite));
    }

    @Transactional
    public CampaignInviteAdminResponse revokeInvite(UUID campaignId, UUID inviteId, AuthenticatedUser authenticatedUser) {
        requireGmMembership(campaignId, authenticatedUser.id());
        CampaignInvite invite = campaignInviteRepository.findByIdAndCampaignId(inviteId, campaignId)
                .orElseThrow(() -> new ApiException("INVITE_NOT_FOUND", HttpStatus.NOT_FOUND, "Invite not found"));
        invite.setStatus(InviteStatus.REVOKED);
        return toInviteResponse(campaignInviteRepository.save(invite));
    }

    @Transactional
    public CampaignLifecycleResponse completeCampaign(UUID campaignId, AuthenticatedUser authenticatedUser) {
        Campaign campaign = requireGmMembership(campaignId, authenticatedUser.id()).getCampaign();
        campaign.setCampaignStatus(CampaignStatus.COMPLETED);
        campaign.setPhaseEndsAt(null);
        return toLifecycleResponse(campaignRepository.save(campaign));
    }

    @Transactional
    public CampaignLifecycleResponse archiveCampaign(UUID campaignId, AuthenticatedUser authenticatedUser) {
        Campaign campaign = requireGmMembership(campaignId, authenticatedUser.id()).getCampaign();
        campaign.setCampaignStatus(CampaignStatus.ARCHIVED);
        campaign.setPhaseEndsAt(null);
        return toLifecycleResponse(campaignRepository.save(campaign));
    }

    @Transactional
    public CampaignLifecycleResponse resetDemoCampaign(UUID campaignId, AuthenticatedUser authenticatedUser) {
        if (!devAuthEnabled) {
            throw new ApiException("CAMPAIGN_RESET_DISABLED", HttpStatus.NOT_FOUND, "Dev-only campaign reset is disabled");
        }

        CampaignMember membership = requireGmMembership(campaignId, authenticatedUser.id());
        Campaign currentCampaign = membership.getCampaign();
        currentCampaign.setCampaignStatus(CampaignStatus.ARCHIVED);
        campaignRepository.save(currentCampaign);

        Campaign freshCampaign = seedTemplateCampaign(currentCampaign.getName() + " Reset", membership.getUser());
        return toLifecycleResponse(freshCampaign);
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

    private Campaign seedTemplateCampaign(String name, User creator) {
        Campaign campaign = new Campaign();
        campaign.setName(name);
        campaign.setCreatedBy(creator);
        campaign.setCurrentPhase(CampaignPhase.LOBBY);
        campaign.setCurrentTurnNumber(1);
        campaign.setCampaignStatus(CampaignStatus.ACTIVE);
        campaign.setPhaseStartedAt(Instant.now());
        campaign.setPhaseEndsAt(null);
        campaign.setRulesetVersion("alpha-1");
        campaign.setGmControlsEnabled(true);
        campaign.setFogOfWarEnabled(true);
        campaign.setTimersEnabled(false);
        campaign.setMetadataJson("{\"useDefaultFactions\":true}");
        Campaign savedCampaign = campaignRepository.save(campaign);

        CampaignMember gmMembership = new CampaignMember();
        gmMembership.setCampaign(savedCampaign);
        gmMembership.setUser(creator);
        gmMembership.setRole(CampaignRole.GM);
        CampaignMember savedGmMembership = campaignMemberRepository.save(gmMembership);

        Theatre westernEurope = saveTheatre(savedCampaign, "WE", "Western Europe", 1);
        saveTheatre(savedCampaign, "EE", "Eastern Europe", 2);
        saveTheatre(savedCampaign, "NA", "North Africa", 3);
        saveTheatre(savedCampaign, "PA", "Pacific", 4);

        Faction allies = saveFaction(savedCampaign, "allies", "Allied Forces", "#2244aa");
        Faction axis = saveFaction(savedCampaign, "axis", "Axis Forces", "#772222");

        Nation greatBritain = saveNation(savedCampaign, allies, "great_britain", "Great Britain");
        Nation germany = saveNation(savedCampaign, axis, "germany", "Germany");

        Territory normandy = saveTerritory(savedCampaign, westernEurope, "normandy", "Normandy");
        Territory calais = saveTerritory(savedCampaign, westernEurope, "calais", "Calais");

        Turn currentTurn = new Turn();
        currentTurn.setCampaign(savedCampaign);
        currentTurn.setTurnNumber(1);
        currentTurn.setPhase(CampaignPhase.LOBBY);
        currentTurn.setStartsAt(Instant.now());
        Turn savedTurn = turnRepository.save(currentTurn);

        saveTerritoryState(savedTurn, normandy, allies, greatBritain);
        saveTerritoryState(savedTurn, calais, axis, germany);

        savePlatoon(savedCampaign, savedGmMembership, allies, greatBritain, normandy, savedTurn, "allies-1", "Allied 1st Platoon");
        savePlatoon(savedCampaign, null, axis, germany, calais, savedTurn, "axis-1", "Axis 1st Platoon");

        return savedCampaign;
    }

    private Theatre saveTheatre(Campaign campaign, String key, String name, int displayOrder) {
        Theatre theatre = new Theatre();
        theatre.setCampaign(campaign);
        theatre.setTheatreKey(key);
        theatre.setName(name);
        theatre.setDisplayOrder(displayOrder);
        theatre.setActive(true);
        return theatreRepository.save(theatre);
    }

    private Faction saveFaction(Campaign campaign, String key, String name, String color) {
        Faction faction = new Faction();
        faction.setCampaign(campaign);
        faction.setFactionKey(key);
        faction.setName(name);
        faction.setType(FactionType.MAJOR);
        faction.setColor(color);
        faction.setPlayerControlled(true);
        return factionRepository.save(faction);
    }

    private Nation saveNation(Campaign campaign, Faction faction, String key, String name) {
        Nation nation = new Nation();
        nation.setCampaign(campaign);
        nation.setFaction(faction);
        nation.setNationKey(key);
        nation.setName(name);
        nation.setNpc(false);
        nation.setMetadataJson("{}");
        return nationRepository.save(nation);
    }

    private Territory saveTerritory(Campaign campaign, Theatre theatre, String key, String name) {
        Territory territory = new Territory();
        territory.setCampaign(campaign);
        territory.setTheatre(theatre);
        territory.setTerritoryKey(key);
        territory.setName(name);
        territory.setTerrainType("UNKNOWN");
        territory.setStrategicTagsJson("[]");
        territory.setBaseIndustry(1);
        territory.setBaseManpower(1);
        territory.setHasPort(false);
        territory.setHasAirfield(false);
        territory.setMaxFortLevel(0);
        territory.setMetadataJson("{}");
        return territoryRepository.save(territory);
    }

    private void saveTerritoryState(Turn turn, Territory territory, Faction faction, Nation nation) {
        TerritoryState territoryState = new TerritoryState();
        territoryState.setTurn(turn);
        territoryState.setTerritory(territory);
        territoryState.setControllingFaction(faction);
        territoryState.setControllerNation(nation);
        territoryState.setStrategicStatus(TerritoryStrategicStatus.CONTROLLED);
        territoryState.setFortLevel(0);
        territoryState.setPartisanRisk(0);
        territoryState.setSupplyStatus("SUPPLIED");
        territoryStateRepository.save(territoryState);
    }

    private void savePlatoon(Campaign campaign,
                             CampaignMember assignedMember,
                             Faction faction,
                             Nation nation,
                             Territory homeTerritory,
                             Turn turn,
                             String platoonKey,
                             String platoonName) {
        Platoon platoon = new Platoon();
        platoon.setCampaign(campaign);
        platoon.setFaction(faction);
        platoon.setNation(nation);
        platoon.setAssignedMember(assignedMember);
        platoon.setHomeTerritory(homeTerritory);
        platoon.setPlatoonKey(platoonKey);
        platoon.setName(platoonName);
        platoon.setUnitType("INFANTRY");
        platoon.setHiddenFromPlayers(false);
        platoon.setMetadataJson("{\"mpBase\":1,\"traits\":[],\"entrenched\":false}");
        Platoon savedPlatoon = platoonRepository.save(platoon);

        PlatoonState platoonState = new PlatoonState();
        platoonState.setTurn(turn);
        platoonState.setPlatoon(savedPlatoon);
        platoonState.setTerritory(homeTerritory);
        platoonState.setName(platoonName);
        platoonState.setReadinessStatus(PlatoonReadinessStatus.ACTIVE);
        platoonState.setStrength(100);
        platoonState.setHiddenFromPlayers(false);
        platoonStateRepository.save(platoonState);
    }

    private CampaignLifecycleResponse toLifecycleResponse(Campaign campaign) {
        return new CampaignLifecycleResponse(
                campaign.getId(),
                campaign.getName(),
                campaign.getCampaignStatus(),
                campaign.getCurrentPhase(),
                campaign.getCurrentTurnNumber()
        );
    }

    private CampaignInviteAdminResponse toInviteResponse(CampaignInvite invite) {
        return new CampaignInviteAdminResponse(
                invite.getId(),
                invite.getCampaign().getId(),
                invite.getInviteeEmail(),
                invite.getInviteToken(),
                invite.getIntendedRole(),
                invite.getStatus(),
                invite.getExpiresAt()
        );
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
