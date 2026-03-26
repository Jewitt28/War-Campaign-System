package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.BattleStatus;
import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.OrderSubmission;
import com.warcampaign.backend.domain.model.Platoon;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignResolutionIntegrationTest {

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
    private CampaignMemberRepository campaignMemberRepository;

    @Autowired
    private CampaignInviteRepository campaignInviteRepository;

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

    @Autowired
    private NotificationRepository notificationRepository;

    private Campaign campaign;
    private CampaignMember alliedMember;
    private Faction allies;
    private Faction axis;
    private Territory normandy;
    private Territory calais;
    private Platoon alliedPlatoon;
    private Platoon axisPlatoon;

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
        campaignInviteRepository.deleteAll();
        campaignMemberRepository.deleteAll();
        nationRepository.deleteAll();
        territoryRepository.deleteAll();
        turnRepository.deleteAll();
        theatreRepository.deleteAll();
        factionRepository.deleteAll();
        campaignRepository.deleteAll();
        userRepository.deleteAll();

        User gmUser = saveUser("gm@war.local", "gm");
        User alliedUser = saveUser("allied@war.local", "ally");
        User observerUser = saveUser("observer@war.local", "observer");

        campaign = saveCampaign("Resolution Front", gmUser);
        Theatre theatre = saveTheatre(campaign, "west", "Western Europe", 1);
        allies = saveFaction(campaign, "allies", "Allies");
        axis = saveFaction(campaign, "axis", "Axis");
        Nation british = saveNation(campaign, allies, "uk", "United Kingdom");
        Nation german = saveNation(campaign, axis, "de", "Germany");

        saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        alliedMember = saveMembership(campaign, alliedUser, CampaignRole.PLAYER, allies, british);
        saveMembership(campaign, observerUser, CampaignRole.OBSERVER, null, null);

        normandy = saveTerritory(campaign, theatre, "normandy", "Normandy");
        calais = saveTerritory(campaign, theatre, "calais", "Calais");

        Turn turn = saveTurn(campaign, 1, CampaignPhase.RESOLUTION);
        saveTerritoryState(turn, normandy, allies, british, TerritoryStrategicStatus.CONTROLLED, 1, "SUPPLIED");
        saveTerritoryState(turn, calais, axis, german, TerritoryStrategicStatus.CONTROLLED, 2, "SUPPLIED");

        alliedPlatoon = savePlatoon(campaign, allies, british, alliedMember, normandy, "allied-1", "Allied 1st Platoon");
        axisPlatoon = savePlatoon(campaign, axis, german, null, calais, "axis-1", "Axis 1st Platoon");

        savePlatoonState(turn, alliedPlatoon, normandy, PlatoonReadinessStatus.ACTIVE, 8);
        savePlatoonState(turn, axisPlatoon, calais, PlatoonReadinessStatus.ACTIVE, 9);
    }

    @Test
    void gmCanResolveTurnAndGenerateBattleSummary() throws Exception {
        mockMvc.perform(put("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", campaign.getId(), 1)
                        .header("X-Dev-User", "allied@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "orders": [
                                    {
                                      "platoonId": "%s",
                                      "orderType": "ATTACK",
                                      "sourceTerritoryId": "%s",
                                      "targetTerritoryId": "%s"
                                    }
                                  ]
                                }
                                """.formatted(alliedPlatoon.getId(), normandy.getId(), calais.getId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_PHASE_INVALID"));

        campaign.setCurrentPhase(CampaignPhase.OPERATIONS);
        campaignRepository.save(campaign);
        Turn turn = turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), 1).orElseThrow();
        turn.setPhase(CampaignPhase.OPERATIONS);
        turnRepository.save(turn);

        mockMvc.perform(put("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", campaign.getId(), 1)
                        .header("X-Dev-User", "allied@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "orders": [
                                    {
                                      "platoonId": "%s",
                                      "orderType": "ATTACK",
                                      "sourceTerritoryId": "%s",
                                      "targetTerritoryId": "%s"
                                    }
                                  ]
                                }
                                """.formatted(alliedPlatoon.getId(), normandy.getId(), calais.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VALIDATED"));

        mockMvc.perform(post("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me/lock", campaign.getId(), 1)
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"));

        campaign.setCurrentPhase(CampaignPhase.RESOLUTION);
        campaignRepository.save(campaign);
        turn.setPhase(CampaignPhase.RESOLUTION);
        turnRepository.save(turn);

        mockMvc.perform(post("/api/campaigns/{campaignId}/turns/{turnNumber}/resolve", campaign.getId(), 1)
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.turnNumber").value(1))
                .andExpect(jsonPath("$.revealedSubmissionCount").value(1))
                .andExpect(jsonPath("$.battleCount").value(1))
                .andExpect(jsonPath("$.eventCount").value(3))
                .andExpect(jsonPath("$.submissions[0].status").value("REVEALED"))
                .andExpect(jsonPath("$.battles[0].battleStatus").value("PENDING"))
                .andExpect(jsonPath("$.battles[0].territoryId").value(calais.getId().toString()))
                .andExpect(jsonPath("$.battles[0].participants.length()").value(2))
                .andExpect(jsonPath("$.events[?(@.eventType=='BATTLE_GENERATED')]").exists());

        OrderSubmission submission = orderSubmissionRepository.findAll().getFirst();
        assertThat(submission.getStatus()).isEqualTo(OrderSubmissionStatus.REVEALED);
        assertThat(submission.getRevealAt()).isNotNull();
        assertThat(battleRepository.findAll()).hasSize(1);
        assertThat(battleParticipantRepository.findAll()).hasSize(2);
        assertThat(resolutionEventRepository.findAll()).hasSize(3);
        assertThat(battleRepository.findAll().getFirst().getBattleStatus()).isEqualTo(BattleStatus.PENDING);
    }

    @Test
    void nonGmCannotResolveOrReadResolutionSummary() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/turns/{turnNumber}/resolve", campaign.getId(), 1)
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));

        mockMvc.perform(get("/api/campaigns/{campaignId}/turns/{turnNumber}/resolution", campaign.getId(), 1)
                        .header("X-Dev-User", "observer@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void gmCanReadGeneratedResolutionSummary() throws Exception {
        gmCanResolveTurnAndGenerateBattleSummary();

        mockMvc.perform(get("/api/campaigns/{campaignId}/turns/{turnNumber}/resolution", campaign.getId(), 1)
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.battleCount").value(1))
                .andExpect(jsonPath("$.submissions[0].submittedByDisplayName").value("ally"))
                .andExpect(jsonPath("$.events.length()").value(3));
    }

    @Test
    void resolutionCannotRunTwice() throws Exception {
        gmCanResolveTurnAndGenerateBattleSummary();

        mockMvc.perform(post("/api/campaigns/{campaignId}/turns/{turnNumber}/resolve", campaign.getId(), 1)
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TURN_RESOLUTION_ALREADY_RUN"));
    }

    private User saveUser(String email, String displayName) {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setActive(true);
        return userRepository.save(user);
    }

    private Campaign saveCampaign(String name, User createdBy) {
        Campaign savedCampaign = new Campaign();
        savedCampaign.setName(name);
        savedCampaign.setCurrentPhase(CampaignPhase.RESOLUTION);
        savedCampaign.setCurrentTurnNumber(1);
        savedCampaign.setCampaignStatus(CampaignStatus.ACTIVE);
        savedCampaign.setRulesetVersion("alpha-1");
        savedCampaign.setPhaseStartedAt(Instant.parse("2026-03-26T12:00:00Z"));
        savedCampaign.setCreatedBy(createdBy);
        return campaignRepository.save(savedCampaign);
    }

    private CampaignMember saveMembership(Campaign campaign,
                                          User user,
                                          CampaignRole role,
                                          Faction faction,
                                          Nation nation) {
        CampaignMember membership = new CampaignMember();
        membership.setCampaign(campaign);
        membership.setUser(user);
        membership.setRole(role);
        membership.setFaction(faction);
        membership.setNation(nation);
        return campaignMemberRepository.save(membership);
    }

    private Faction saveFaction(Campaign campaign, String key, String name) {
        Faction faction = new Faction();
        faction.setCampaign(campaign);
        faction.setFactionKey(key);
        faction.setName(name);
        faction.setType(FactionType.MAJOR);
        faction.setColor("#123456");
        faction.setPlayerControlled(true);
        return factionRepository.save(faction);
    }

    private Nation saveNation(Campaign campaign, Faction faction, String key, String name) {
        Nation nation = new Nation();
        nation.setCampaign(campaign);
        nation.setFaction(faction);
        nation.setNationKey(key);
        nation.setName(name);
        return nationRepository.save(nation);
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

    private Territory saveTerritory(Campaign campaign, Theatre theatre, String code, String name) {
        Territory territory = new Territory();
        territory.setCampaign(campaign);
        territory.setTheatre(theatre);
        territory.setTerritoryKey(code);
        territory.setName(name);
        territory.setTerrainType("PLAINS");
        territory.setBaseIndustry(1);
        territory.setBaseManpower(1);
        territory.setMetadataJson("{\"priority\":\"high\"}");
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
                                              Faction faction,
                                              Nation nation,
                                              com.warcampaign.backend.domain.enums.TerritoryStrategicStatus status,
                                              int fortLevel,
                                              String supplyStatus) {
        TerritoryState state = new TerritoryState();
        state.setTurn(turn);
        state.setTerritory(territory);
        state.setControllingFaction(faction);
        state.setControllerNation(nation);
        state.setStrategicStatus(status);
        state.setFortLevel(fortLevel);
        state.setPartisanRisk(0);
        state.setSupplyStatus(supplyStatus);
        return territoryStateRepository.save(state);
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
        PlatoonState state = new PlatoonState();
        state.setTurn(turn);
        state.setPlatoon(platoon);
        state.setTerritory(territory);
        state.setReadinessStatus(readinessStatus);
        state.setStrength(strength);
        return platoonStateRepository.save(state);
    }
}
