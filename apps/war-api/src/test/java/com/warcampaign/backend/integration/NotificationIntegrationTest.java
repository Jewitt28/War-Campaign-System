package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.enums.InviteStatus;
import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;
import com.warcampaign.backend.domain.enums.PlatoonOrderType;
import com.warcampaign.backend.domain.enums.PlatoonOrderValidationStatus;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignInvite;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.Notification;
import com.warcampaign.backend.domain.model.OrderSubmission;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonOrder;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Theatre;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.TerritoryState;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.repository.BattleParticipantRepository;
import com.warcampaign.backend.repository.BattleRepository;
import com.warcampaign.backend.repository.CampaignAuditLogRepository;
import com.warcampaign.backend.repository.CampaignInviteRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
import com.warcampaign.backend.repository.NotificationRepository;
import com.warcampaign.backend.repository.OrderSubmissionRepository;
import com.warcampaign.backend.repository.PlatoonOrderRepository;
import com.warcampaign.backend.repository.PlatoonRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.ResolutionEventRepository;
import com.warcampaign.backend.repository.TheatreRepository;
import com.warcampaign.backend.repository.TerritoryRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.repository.UserRepository;
import com.warcampaign.backend.repository.VisibilityStateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NotificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CampaignRepository campaignRepository;
    @Autowired
    private CampaignAuditLogRepository campaignAuditLogRepository;
    @Autowired
    private BattleParticipantRepository battleParticipantRepository;
    @Autowired
    private BattleRepository battleRepository;
    @Autowired
    private CampaignInviteRepository campaignInviteRepository;
    @Autowired
    private CampaignMemberRepository campaignMemberRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private PlatoonOrderRepository platoonOrderRepository;
    @Autowired
    private OrderSubmissionRepository orderSubmissionRepository;
    @Autowired
    private PlatoonStateRepository platoonStateRepository;
    @Autowired
    private TerritoryStateRepository territoryStateRepository;
    @Autowired
    private PlatoonRepository platoonRepository;
    @Autowired
    private NationRepository nationRepository;
    @Autowired
    private TerritoryRepository territoryRepository;
    @Autowired
    private TurnRepository turnRepository;
    @Autowired
    private TheatreRepository theatreRepository;
    @Autowired
    private FactionRepository factionRepository;
    @Autowired
    private ResolutionEventRepository resolutionEventRepository;
    @Autowired
    private VisibilityStateRepository visibilityStateRepository;

    @BeforeEach
    void setup() {
        notificationRepository.deleteAll();
        visibilityStateRepository.deleteAll();
        resolutionEventRepository.deleteAll();
        battleParticipantRepository.deleteAll();
        battleRepository.deleteAll();
        campaignAuditLogRepository.deleteAll();
        platoonOrderRepository.deleteAll();
        orderSubmissionRepository.deleteAll();
        platoonStateRepository.deleteAll();
        territoryStateRepository.deleteAll();
        platoonRepository.deleteAll();
        campaignMemberRepository.deleteAll();
        campaignInviteRepository.deleteAll();
        nationRepository.deleteAll();
        territoryRepository.deleteAll();
        turnRepository.deleteAll();
        theatreRepository.deleteAll();
        factionRepository.deleteAll();
        campaignRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void inviteAcceptanceCreatesNotificationAndCanBeMarkedRead() throws Exception {
        User gmUser = saveUser("gm@war.local", "gm");
        Campaign campaign = saveCampaign("Invite Front", gmUser, CampaignPhase.LOBBY, 1);
        saveInvite(campaign, gmUser, "player@war.local", "invite-token");

        mockMvc.perform(post("/api/invites/{token}/accept", "invite-token")
                        .header("X-Dev-User", "player@war.local")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/me/notifications")
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("INVITE_ACCEPTED"))
                .andExpect(jsonPath("$[0].campaignId").value(campaign.getId().toString()));

        Notification notification = notificationRepository.findAllByRecipientUserIdOrderByCreatedAtDesc(
                userRepository.findByEmailIgnoreCase("player@war.local").orElseThrow().getId()
        ).getFirst();

        mockMvc.perform(post("/api/me/notifications/{notificationId}/read", notification.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(notification.getId().toString()))
                .andExpect(jsonPath("$.readAt").isNotEmpty());
    }

    @Test
    void phaseAdvanceCreatesPhaseStartedNotificationForCampaignMembers() throws Exception {
        User gmUser = saveUser("gm@war.local", "gm");
        User playerUser = saveUser("player@war.local", "player");
        Campaign campaign = saveCampaign("Phase Front", gmUser, CampaignPhase.LOBBY, 1);
        saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        saveMembership(campaign, playerUser, CampaignRole.PLAYER, null, null);

        mockMvc.perform(post("/api/campaigns/{campaignId}/phase/advance", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPhase").value("STRATEGIC"));

        mockMvc.perform(get("/api/me/notifications")
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("PHASE_STARTED"));
    }

    @Test
    void operationsAdvanceCreatesOrdersAutoLockedNotification() throws Exception {
        User gmUser = saveUser("gm@war.local", "gm");
        User playerUser = saveUser("player@war.local", "player");
        Campaign campaign = saveCampaign("Orders Front", gmUser, CampaignPhase.OPERATIONS, 1);
        Theatre theatre = saveTheatre(campaign, "west", "Western Front", 1);
        Faction allies = saveFaction(campaign, "allies", "Allies");
        Nation british = saveNation(campaign, allies, "uk", "United Kingdom");
        CampaignMember gmMembership = saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        CampaignMember playerMembership = saveMembership(campaign, playerUser, CampaignRole.PLAYER, allies, british);
        Territory origin = saveTerritory(campaign, theatre, "normandy", "Normandy");
        Territory target = saveTerritory(campaign, theatre, "calais", "Calais");
        Turn turn = saveTurn(campaign, 1, CampaignPhase.OPERATIONS);
        Platoon platoon = savePlatoon(campaign, allies, british, playerMembership, origin, "allied-1", "Allied 1st Platoon");
        savePlatoonState(turn, platoon, origin, PlatoonReadinessStatus.ACTIVE, 8);
        saveValidatedSubmission(campaign, playerMembership, allies, platoon, origin, target, 1);

        mockMvc.perform(post("/api/campaigns/{campaignId}/phase/advance", campaign.getId())
                        .header("X-Dev-User", gmMembership.getUser().getEmail()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPhase").value("RESOLUTION"));

        List<Notification> notifications = notificationRepository.findAllByRecipientUserIdOrderByCreatedAtDesc(playerUser.getId());
        assertThat(notifications).extracting(Notification::getType).contains("ORDERS_AUTO_LOCKED");
    }

    @Test
    void resolutionCreatesBattleAndCompletionNotifications() throws Exception {
        User gmUser = saveUser("gm@war.local", "gm");
        User alliedUser = saveUser("allied@war.local", "ally");
        User axisUser = saveUser("axis@war.local", "axis");
        Campaign campaign = saveCampaign("Resolution Front", gmUser, CampaignPhase.RESOLUTION, 1);
        Theatre theatre = saveTheatre(campaign, "west", "Western Front", 1);
        Faction allies = saveFaction(campaign, "allies", "Allies");
        Faction axis = saveFaction(campaign, "axis", "Axis");
        Nation british = saveNation(campaign, allies, "uk", "United Kingdom");
        Nation german = saveNation(campaign, axis, "de", "Germany");
        saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        CampaignMember alliedMembership = saveMembership(campaign, alliedUser, CampaignRole.PLAYER, allies, british);
        CampaignMember axisMembership = saveMembership(campaign, axisUser, CampaignRole.PLAYER, axis, german);
        Territory normandy = saveTerritory(campaign, theatre, "normandy", "Normandy");
        Territory calais = saveTerritory(campaign, theatre, "calais", "Calais");
        Turn turn = saveTurn(campaign, 1, CampaignPhase.RESOLUTION);
        saveTerritoryState(turn, calais, axis, german, TerritoryStrategicStatus.CONTROLLED);
        Platoon alliedPlatoon = savePlatoon(campaign, allies, british, alliedMembership, normandy, "allied-1", "Allied 1st Platoon");
        Platoon axisPlatoon = savePlatoon(campaign, axis, german, axisMembership, calais, "axis-1", "Axis 1st Platoon");
        savePlatoonState(turn, alliedPlatoon, normandy, PlatoonReadinessStatus.ACTIVE, 8);
        savePlatoonState(turn, axisPlatoon, calais, PlatoonReadinessStatus.ACTIVE, 8);
        saveLockedSubmission(campaign, alliedMembership, allies, alliedPlatoon, normandy, calais, 1);

        mockMvc.perform(post("/api/campaigns/{campaignId}/turns/{turnNumber}/resolve", campaign.getId(), 1)
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.battles.length()").value(1));

        List<Notification> notifications = notificationRepository.findAllByRecipientUserIdOrderByCreatedAtDesc(alliedUser.getId());
        assertThat(notifications).extracting(Notification::getType)
                .contains("NEW_BATTLE_CREATED", "RESOLUTION_COMPLETED");
    }

    @Test
    void userCannotMarkAnotherUsersNotificationRead() throws Exception {
        User gmUser = saveUser("gm@war.local", "gm");
        User playerUser = saveUser("player@war.local", "player");
        Campaign campaign = saveCampaign("Private Front", gmUser, CampaignPhase.LOBBY, 1);
        saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        saveMembership(campaign, playerUser, CampaignRole.PLAYER, null, null);

        mockMvc.perform(post("/api/campaigns/{campaignId}/phase/advance", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk());

        Notification notification = notificationRepository.findAllByRecipientUserIdOrderByCreatedAtDesc(playerUser.getId()).getFirst();

        mockMvc.perform(post("/api/me/notifications/{notificationId}/read", notification.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOTIFICATION_NOT_FOUND"));
    }

    private User saveUser(String email, String displayName) {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setActive(true);
        return userRepository.save(user);
    }

    private Campaign saveCampaign(String name, User createdBy, CampaignPhase phase, int turnNumber) {
        Campaign campaign = new Campaign();
        campaign.setName(name);
        campaign.setCreatedBy(createdBy);
        campaign.setCurrentPhase(phase);
        campaign.setCurrentTurnNumber(turnNumber);
        campaign.setCampaignStatus(CampaignStatus.ACTIVE);
        campaign.setRulesetVersion("alpha-1");
        campaign.setPhaseStartedAt(Instant.parse("2026-03-26T12:00:00Z"));
        return campaignRepository.save(campaign);
    }

    private CampaignInvite saveInvite(Campaign campaign, User invitedBy, String inviteeEmail, String token) {
        CampaignInvite invite = new CampaignInvite();
        invite.setCampaign(campaign);
        invite.setInvitedBy(invitedBy);
        invite.setInviteeEmail(inviteeEmail);
        invite.setInviteToken(token);
        invite.setIntendedRole(CampaignRole.PLAYER);
        invite.setStatus(InviteStatus.PENDING);
        invite.setExpiresAt(Instant.now().plusSeconds(3600));
        return campaignInviteRepository.save(invite);
    }

    private CampaignMember saveMembership(Campaign campaign, User user, CampaignRole role, Faction faction, Nation nation) {
        CampaignMember member = new CampaignMember();
        member.setCampaign(campaign);
        member.setUser(user);
        member.setRole(role);
        member.setFaction(faction);
        member.setNation(nation);
        return campaignMemberRepository.save(member);
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

    private Faction saveFaction(Campaign campaign, String key, String name) {
        Faction faction = new Faction();
        faction.setCampaign(campaign);
        faction.setFactionKey(key);
        faction.setName(name);
        faction.setType(FactionType.MAJOR);
        faction.setColor("#224466");
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
        return nationRepository.save(nation);
    }

    private Territory saveTerritory(Campaign campaign, Theatre theatre, String key, String name) {
        Territory territory = new Territory();
        territory.setCampaign(campaign);
        territory.setTheatre(theatre);
        territory.setTerritoryKey(key);
        territory.setName(name);
        territory.setTerrainType("PLAINS");
        territory.setBaseIndustry(1);
        territory.setBaseManpower(1);
        territory.setMaxFortLevel(3);
        return territoryRepository.save(territory);
    }

    private Turn saveTurn(Campaign campaign, int turnNumber, CampaignPhase phase) {
        Turn turn = new Turn();
        turn.setCampaign(campaign);
        turn.setTurnNumber(turnNumber);
        turn.setPhase(phase);
        turn.setStartsAt(Instant.parse("2026-03-26T12:00:00Z"));
        return turnRepository.save(turn);
    }

    private TerritoryState saveTerritoryState(Turn turn,
                                              Territory territory,
                                              Faction controllingFaction,
                                              Nation controllerNation,
                                              TerritoryStrategicStatus status) {
        TerritoryState territoryState = new TerritoryState();
        territoryState.setTurn(turn);
        territoryState.setTerritory(territory);
        territoryState.setControllingFaction(controllingFaction);
        territoryState.setControllerNation(controllerNation);
        territoryState.setStrategicStatus(status);
        territoryState.setFortLevel(1);
        territoryState.setSupplyStatus("SUPPLIED");
        return territoryStateRepository.save(territoryState);
    }

    private Platoon savePlatoon(Campaign campaign,
                                Faction faction,
                                Nation nation,
                                CampaignMember assignedMember,
                                Territory homeTerritory,
                                String key,
                                String name) {
        Platoon platoon = new Platoon();
        platoon.setCampaign(campaign);
        platoon.setFaction(faction);
        platoon.setNation(nation);
        platoon.setAssignedMember(assignedMember);
        platoon.setHomeTerritory(homeTerritory);
        platoon.setPlatoonKey(key);
        platoon.setName(name);
        platoon.setUnitType("INFANTRY");
        platoon.setHiddenFromPlayers(false);
        return platoonRepository.save(platoon);
    }

    private PlatoonState savePlatoonState(Turn turn,
                                          Platoon platoon,
                                          Territory territory,
                                          PlatoonReadinessStatus readinessStatus,
                                          int strength) {
        PlatoonState platoonState = new PlatoonState();
        platoonState.setTurn(turn);
        platoonState.setPlatoon(platoon);
        platoonState.setTerritory(territory);
        platoonState.setReadinessStatus(readinessStatus);
        platoonState.setStrength(strength);
        return platoonStateRepository.save(platoonState);
    }

    private void saveValidatedSubmission(Campaign campaign,
                                         CampaignMember member,
                                         Faction faction,
                                         Platoon platoon,
                                         Territory source,
                                         Territory target,
                                         int turnNumber) {
        OrderSubmission submission = new OrderSubmission();
        submission.setCampaign(campaign);
        submission.setTurnNumber(turnNumber);
        submission.setSubmittedByMember(member);
        submission.setFaction(faction);
        submission.setStatus(OrderSubmissionStatus.VALIDATED);
        submission.setSubmittedAt(Instant.now());
        OrderSubmission savedSubmission = orderSubmissionRepository.save(submission);

        PlatoonOrder order = new PlatoonOrder();
        order.setOrderSubmission(savedSubmission);
        order.setPlatoon(platoon);
        order.setOrderType(PlatoonOrderType.MOVE);
        order.setSourceTerritory(source);
        order.setTargetTerritory(target);
        order.setPayloadJson("{}");
        order.setValidationStatus(PlatoonOrderValidationStatus.VALID);
        platoonOrderRepository.save(order);
    }

    private void saveLockedSubmission(Campaign campaign,
                                      CampaignMember member,
                                      Faction faction,
                                      Platoon platoon,
                                      Territory source,
                                      Territory target,
                                      int turnNumber) {
        OrderSubmission submission = new OrderSubmission();
        submission.setCampaign(campaign);
        submission.setTurnNumber(turnNumber);
        submission.setSubmittedByMember(member);
        submission.setFaction(faction);
        submission.setStatus(OrderSubmissionStatus.LOCKED);
        submission.setSubmittedAt(Instant.now());
        submission.setLockedAt(Instant.now());
        submission.setChecksum("locked");
        OrderSubmission savedSubmission = orderSubmissionRepository.save(submission);

        PlatoonOrder order = new PlatoonOrder();
        order.setOrderSubmission(savedSubmission);
        order.setPlatoon(platoon);
        order.setOrderType(PlatoonOrderType.ATTACK);
        order.setSourceTerritory(source);
        order.setTargetTerritory(target);
        order.setPayloadJson("{}");
        order.setValidationStatus(PlatoonOrderValidationStatus.VALID);
        platoonOrderRepository.save(order);
    }
}
