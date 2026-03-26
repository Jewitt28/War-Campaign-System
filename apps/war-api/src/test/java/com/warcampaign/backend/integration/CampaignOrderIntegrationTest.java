package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Theatre;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.repository.CampaignInviteRepository;
import com.warcampaign.backend.repository.CampaignAuditLogRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignOrderIntegrationTest {

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

    private Campaign alphaCampaign;
    private Territory normandy;
    private Territory calais;
    private Platoon alliedPlatoon;
    private Platoon axisPlatoon;

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
        User alliedPlayer = saveUser("allied@war.local", "ally");
        User observer = saveUser("observer@war.local", "observer");

        alphaCampaign = saveCampaign("Alpha Front", gmUser, 2, CampaignPhase.OPERATIONS);

        Theatre theatre = saveTheatre(alphaCampaign, "west", "Western Europe", 1);
        Faction allies = saveFaction(alphaCampaign, "allies", "Allies");
        Faction axis = saveFaction(alphaCampaign, "axis", "Axis");
        Nation british = saveNation(alphaCampaign, allies, "uk", "United Kingdom");
        Nation german = saveNation(alphaCampaign, axis, "de", "Germany");

        saveMembership(alphaCampaign, gmUser, CampaignRole.GM, null, null);
        saveMembership(alphaCampaign, observer, CampaignRole.OBSERVER, null, null);
        CampaignMember alliedMembership = saveMembership(alphaCampaign, alliedPlayer, CampaignRole.PLAYER, allies, british);

        normandy = saveTerritory(alphaCampaign, theatre, "normandy", "Normandy");
        calais = saveTerritory(alphaCampaign, theatre, "calais", "Calais");
        Territory berlin = saveTerritory(alphaCampaign, theatre, "berlin", "Berlin");

        Turn turn1 = saveTurn(alphaCampaign, 1);
        Turn turn2 = saveTurn(alphaCampaign, 2);

        alliedPlatoon = savePlatoon(alphaCampaign, allies, british, alliedMembership, normandy, "allies-1", "Allied 1st Platoon");
        axisPlatoon = savePlatoon(alphaCampaign, axis, german, null, berlin, "axis-1", "Axis 1st Platoon");

        savePlatoonState(turn1, alliedPlatoon, berlin, PlatoonReadinessStatus.ACTIVE, 8);
        savePlatoonState(turn2, alliedPlatoon, normandy, PlatoonReadinessStatus.ACTIVE, 7);
        savePlatoonState(turn2, axisPlatoon, berlin, PlatoonReadinessStatus.ACTIVE, 9);
    }

    @Test
    void playerGetsEmptySubmissionForCurrentTurn() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", alphaCampaign.getId(), 2)
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submissionId").isEmpty())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.orders.length()").value(0));
    }

    @Test
    void playerCanSaveValidOrdersForControlledPlatoon() throws Exception {
        mockMvc.perform(put("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", alphaCampaign.getId(), 2)
                        .header("X-Dev-User", "allied@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "orders": [
                                    {
                                      "platoonId": "%s",
                                      "orderType": "MOVE",
                                      "sourceTerritoryId": "%s",
                                      "targetTerritoryId": "%s",
                                      "payloadJson": "{\\"stance\\":\\"aggressive\\"}"
                                    }
                                  ]
                                }
                                """.formatted(alliedPlatoon.getId(), normandy.getId(), calais.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VALIDATED"))
                .andExpect(jsonPath("$.orders.length()").value(1))
                .andExpect(jsonPath("$.orders[0].platoonId").value(alliedPlatoon.getId().toString()))
                .andExpect(jsonPath("$.orders[0].validationStatus").value("VALID"))
                .andExpect(jsonPath("$.orders[0].targetTerritoryId").value(calais.getId().toString()));
    }

    @Test
    void playerCannotSaveOrdersForAnotherFactionPlatoon() throws Exception {
        mockMvc.perform(put("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", alphaCampaign.getId(), 2)
                        .header("X-Dev-User", "allied@war.local")
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
                                """.formatted(axisPlatoon.getId(), normandy.getId(), calais.getId())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PLATOON_FORBIDDEN"));
    }

    @Test
    void lockRequiresValidatedSubmissionAndEnforcesImmutability() throws Exception {
        mockMvc.perform(put("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", alphaCampaign.getId(), 2)
                        .header("X-Dev-User", "allied@war.local")
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
                                """.formatted(alliedPlatoon.getId(), normandy.getId(), calais.getId())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me/lock", alphaCampaign.getId(), 2)
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LOCKED"))
                .andExpect(jsonPath("$.lockedAt").isNotEmpty())
                .andExpect(jsonPath("$.checksum").isNotEmpty());

        mockMvc.perform(put("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", alphaCampaign.getId(), 2)
                        .header("X-Dev-User", "allied@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "orders": [
                                    {
                                      "platoonId": "%s",
                                      "orderType": "HOLD"
                                    }
                                  ]
                                }
                                """.formatted(alliedPlatoon.getId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_SUBMISSION_LOCKED"));
    }

    @Test
    void cannotEditOrdersOutsideOperationsPhase() throws Exception {
        alphaCampaign.setCurrentPhase(CampaignPhase.LOBBY);
        campaignRepository.save(alphaCampaign);

        mockMvc.perform(put("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", alphaCampaign.getId(), 2)
                        .header("X-Dev-User", "allied@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "orders": [
                                    {
                                      "platoonId": "%s",
                                      "orderType": "HOLD"
                                    }
                                  ]
                                }
                                """.formatted(alliedPlatoon.getId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ORDER_PHASE_INVALID"));
    }

    @Test
    void observerCannotAccessOrderSubmission() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/turns/{turnNumber}/orders/me", alphaCampaign.getId(), 2)
                        .header("X-Dev-User", "observer@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    private User saveUser(String email, String displayName) {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setActive(true);
        return userRepository.save(user);
    }

    private Campaign saveCampaign(String name, User createdBy, int currentTurnNumber, CampaignPhase phase) {
        Campaign campaign = new Campaign();
        campaign.setName(name);
        campaign.setCurrentPhase(phase);
        campaign.setCurrentTurnNumber(currentTurnNumber);
        campaign.setCampaignStatus(CampaignStatus.ACTIVE);
        campaign.setRulesetVersion("alpha-1");
        campaign.setPhaseStartedAt(Instant.parse("2026-03-26T10:00:00Z"));
        campaign.setPhaseEndsAt(Instant.parse("2026-03-26T18:00:00Z"));
        campaign.setCreatedBy(createdBy);
        return campaignRepository.save(campaign);
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
        territory.setHasPort(false);
        territory.setHasAirfield(false);
        territory.setMaxFortLevel(3);
        return territoryRepository.save(territory);
    }

    private Turn saveTurn(Campaign campaign, int turnNumber) {
        Turn turn = new Turn();
        turn.setCampaign(campaign);
        turn.setTurnNumber(turnNumber);
        turn.setPhase(CampaignPhase.OPERATIONS);
        turn.setStartsAt(Instant.parse("2026-03-26T00:00:00Z").plusSeconds(turnNumber));
        return turnRepository.save(turn);
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
