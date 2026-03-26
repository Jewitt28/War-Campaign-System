package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignAuditLog;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.OrderSubmission;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Theatre;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.repository.CampaignAuditLogRepository;
import com.warcampaign.backend.repository.CampaignInviteRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
import com.warcampaign.backend.repository.OrderSubmissionRepository;
import com.warcampaign.backend.repository.PlatoonOrderRepository;
import com.warcampaign.backend.repository.PlatoonRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TheatreRepository;
import com.warcampaign.backend.repository.TerritoryRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.repository.UserRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignPhaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private CampaignAuditLogRepository campaignAuditLogRepository;

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

    private Campaign campaign;
    private CampaignMember playerMembership;
    private Platoon platoon;
    private Territory origin;
    private Territory target;

    @BeforeEach
    void setup() {
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
        User playerUser = saveUser("player@war.local", "player");

        campaign = saveCampaign("Alpha Front", gmUser, 1, CampaignPhase.LOBBY);

        Faction allies = saveFaction(campaign, "allies", "Allies");
        Nation british = saveNation(campaign, allies, "uk", "United Kingdom");
        Theatre theatre = saveTheatre(campaign, "west", "Western Europe", 1);

        saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        playerMembership = saveMembership(campaign, playerUser, CampaignRole.PLAYER, allies, british);

        origin = saveTerritory(campaign, theatre, "normandy", "Normandy");
        target = saveTerritory(campaign, theatre, "calais", "Calais");
        platoon = savePlatoon(campaign, allies, british, playerMembership, origin, "allies-1", "Allied 1st Platoon");
        Turn turn1 = saveTurn(campaign, 1, CampaignPhase.LOBBY);
        savePlatoonState(turn1, platoon, origin, PlatoonReadinessStatus.ACTIVE, 8);
    }

    @Test
    void gmCanAdvancePhaseThroughWorkflow() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/phase/advance", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPhase").value("STRATEGIC"))
                .andExpect(jsonPath("$.currentTurnNumber").value(1));

        campaign = campaignRepository.findById(campaign.getId()).orElseThrow();
        assertThat(campaign.getCurrentPhase()).isEqualTo(CampaignPhase.STRATEGIC);
        List<CampaignAuditLog> auditLogs = campaignAuditLogRepository.findAllByCampaignIdOrderByCreatedAtAsc(campaign.getId());
        assertThat(auditLogs).hasSize(1);
        assertThat(auditLogs.getFirst().getActionType()).isEqualTo("CAMPAIGN_PHASE_ADVANCED");
    }

    @Test
    void nonGmCannotAdvancePhase() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/phase/advance", campaign.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void interturnAdvanceCreatesNextTurn() throws Exception {
        campaign.setCurrentPhase(CampaignPhase.INTERTURN);
        campaign.setCurrentTurnNumber(1);
        campaignRepository.save(campaign);

        mockMvc.perform(post("/api/campaigns/{campaignId}/phase/advance", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPhase").value("STRATEGIC"))
                .andExpect(jsonPath("$.currentTurnNumber").value(2));

        assertThat(turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), 2)).isPresent();
    }

    @Test
    void advancingFromOperationsAutoLocksValidatedOrders() throws Exception {
        campaign.setCurrentPhase(CampaignPhase.OPERATIONS);
        campaign.setPhaseStartedAt(Instant.parse("2026-03-26T12:00:00Z"));
        campaignRepository.save(campaign);

        Turn turn = turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), 1).orElseThrow();
        turn.setPhase(CampaignPhase.OPERATIONS);
        turnRepository.save(turn);

        mockMvc.perform(put("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", campaign.getId(), 1)
                        .header("X-Dev-User", "player@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "orders": [
                                    {
                                      "platoonId": "%s",
                                      "orderType": "MOVE",
                                      "sourceTerritoryId": "%s",
                                      "targetTerritoryId": "%s"
                                    }
                                  ]
                                }
                                """.formatted(platoon.getId(), origin.getId(), target.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VALIDATED"));

        mockMvc.perform(post("/api/campaigns/{campaignId}/phase/advance", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPhase").value("RESOLUTION"));

        OrderSubmission submission = orderSubmissionRepository
                .findByCampaignIdAndTurnNumberAndSubmittedByMemberId(campaign.getId(), 1, playerMembership.getId())
                .orElseThrow();
        assertThat(submission.getStatus()).isEqualTo(OrderSubmissionStatus.LOCKED);
        assertThat(submission.getLockedAt()).isNotNull();
    }

    private User saveUser(String email, String displayName) {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setActive(true);
        return userRepository.save(user);
    }

    private Campaign saveCampaign(String name, User createdBy, int currentTurnNumber, CampaignPhase phase) {
        Campaign savedCampaign = new Campaign();
        savedCampaign.setName(name);
        savedCampaign.setCurrentPhase(phase);
        savedCampaign.setCurrentTurnNumber(currentTurnNumber);
        savedCampaign.setCampaignStatus(CampaignStatus.ACTIVE);
        savedCampaign.setRulesetVersion("alpha-1");
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

    private Theatre saveTheatre(Campaign campaign, String key, String name, int displayOrder) {
        Theatre theatre = new Theatre();
        theatre.setCampaign(campaign);
        theatre.setTheatreKey(key);
        theatre.setName(name);
        theatre.setDisplayOrder(displayOrder);
        theatre.setActive(true);
        return theatreRepository.save(theatre);
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
        territory.setHasPort(false);
        territory.setHasAirfield(false);
        territory.setMaxFortLevel(1);
        return territoryRepository.save(territory);
    }

    private Platoon savePlatoon(Campaign campaign,
                                Faction faction,
                                Nation nation,
                                CampaignMember assignedMember,
                                Territory homeTerritory,
                                String key,
                                String name) {
        Platoon savedPlatoon = new Platoon();
        savedPlatoon.setCampaign(campaign);
        savedPlatoon.setFaction(faction);
        savedPlatoon.setNation(nation);
        savedPlatoon.setAssignedMember(assignedMember);
        savedPlatoon.setHomeTerritory(homeTerritory);
        savedPlatoon.setPlatoonKey(key);
        savedPlatoon.setName(name);
        savedPlatoon.setUnitType("INFANTRY");
        return platoonRepository.save(savedPlatoon);
    }

    private Turn saveTurn(Campaign campaign, int turnNumber, CampaignPhase phase) {
        Turn turn = new Turn();
        turn.setCampaign(campaign);
        turn.setTurnNumber(turnNumber);
        turn.setPhase(phase);
        turn.setStartsAt(Instant.parse("2026-03-26T00:00:00Z").plusSeconds(turnNumber));
        return turnRepository.save(turn);
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
