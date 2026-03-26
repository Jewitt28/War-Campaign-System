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
import com.warcampaign.backend.repository.BattleParticipantRepository;
import com.warcampaign.backend.repository.BattleRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
import com.warcampaign.backend.repository.NotificationRepository;
import com.warcampaign.backend.repository.OrderSubmissionRepository;
import com.warcampaign.backend.repository.PlatoonRepository;
import com.warcampaign.backend.repository.PlatoonOrderRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TheatreRepository;
import com.warcampaign.backend.repository.TerritoryRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.repository.ResolutionEventRepository;
import com.warcampaign.backend.repository.UserRepository;
import com.warcampaign.backend.repository.VisibilityStateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
class CampaignPlatoonIntegrationTest {

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

    private Campaign alphaCampaign;
    private Campaign bravoCampaign;
    private CampaignMember allyPlayerMembership;
    private Platoon alliedVisiblePlatoon;
    private Platoon alliedHiddenPlatoon;
    private Platoon axisPlatoon;
    private Platoon bravoPlatoon;

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
        User allyPlayer = saveUser("allied@war.local", "ally");
        User observer = saveUser("observer@war.local", "observer");
        User bravoGm = saveUser("bravo-gm@war.local", "bravo");

        alphaCampaign = saveCampaign("Alpha Front", gmUser, 2);
        bravoCampaign = saveCampaign("Bravo Front", bravoGm, 1);

        Theatre alphaTheatre = saveTheatre(alphaCampaign, "west", "Western Europe", 1);
        Theatre bravoTheatre = saveTheatre(bravoCampaign, "east", "Eastern Europe", 1);

        Faction allies = saveFaction(alphaCampaign, "allies", "Allies");
        Faction axis = saveFaction(alphaCampaign, "axis", "Axis");
        Faction soviets = saveFaction(bravoCampaign, "soviet", "Soviet Union");

        Nation british = saveNation(alphaCampaign, allies, "uk", "United Kingdom");
        Nation german = saveNation(alphaCampaign, axis, "de", "Germany");
        Nation soviet = saveNation(bravoCampaign, soviets, "su", "Soviet Union");

        CampaignMember gmMembership = saveMembership(alphaCampaign, gmUser, CampaignRole.GM, null, null);
        allyPlayerMembership = saveMembership(alphaCampaign, allyPlayer, CampaignRole.PLAYER, allies, british);
        saveMembership(alphaCampaign, observer, CampaignRole.OBSERVER, null, null);
        CampaignMember bravoGmMembership = saveMembership(bravoCampaign, bravoGm, CampaignRole.GM, soviets, soviet);

        Territory normandy = saveTerritory(alphaCampaign, alphaTheatre, "normandy", "Normandy");
        Territory calais = saveTerritory(alphaCampaign, alphaTheatre, "calais", "Calais");
        Territory smolensk = saveTerritory(bravoCampaign, bravoTheatre, "smolensk", "Smolensk");

        Turn alphaTurn1 = saveTurn(alphaCampaign, 1);
        Turn alphaTurn2 = saveTurn(alphaCampaign, 2);
        Turn bravoTurn1 = saveTurn(bravoCampaign, 1);

        alliedVisiblePlatoon = savePlatoon(alphaCampaign, allies, british, allyPlayerMembership, normandy, "allies-1", "Allied 1st Platoon", "INFANTRY", false, """
                {"mpBase":2,"traits":["RECON"],"entrenched":true}
                """);
        alliedHiddenPlatoon = savePlatoon(alphaCampaign, allies, british, gmMembership, normandy, "allies-2", "Allied Reserve Platoon", "RESERVE", true, """
                {"mpBase":3,"traits":["ENGINEERS"],"entrenched":false}
                """);
        axisPlatoon = savePlatoon(alphaCampaign, axis, german, null, calais, "axis-1", "Axis 1st Platoon", "ARMOR", false, """
                {"mpBase":1,"traits":[],"entrenched":false}
                """);
        bravoPlatoon = savePlatoon(bravoCampaign, soviets, soviet, bravoGmMembership, smolensk, "soviet-1", "Soviet 1st Platoon", "INFANTRY", false, """
                {"mpBase":1,"traits":["ARMOURED"],"entrenched":false}
                """);

        savePlatoonState(alphaTurn1, alliedVisiblePlatoon, normandy, PlatoonReadinessStatus.ACTIVE, 9, "Old turn");
        savePlatoonState(alphaTurn2, alliedVisiblePlatoon, calais, PlatoonReadinessStatus.DAMAGED, 7, "Current turn");
        savePlatoonState(alphaTurn2, alliedHiddenPlatoon, normandy, PlatoonReadinessStatus.RESERVES, 6, "Hidden reserve");
        savePlatoonState(alphaTurn2, axisPlatoon, calais, PlatoonReadinessStatus.ACTIVE, 10, "Axis detail");
        savePlatoonState(bravoTurn1, bravoPlatoon, smolensk, PlatoonReadinessStatus.ACTIVE, 12, "Bravo detail");
    }

    @Test
    void playerCanListOnlyTheirVisibleFactionPlatoons() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/platoons", alphaCampaign.getId())
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(alliedVisiblePlatoon.getId().toString()))
                .andExpect(jsonPath("$[0].key").value("allies-1"))
                .andExpect(jsonPath("$[0].currentTerritory.key").value("calais"))
                .andExpect(jsonPath("$[0].readinessStatus").value("DAMAGED"))
                .andExpect(jsonPath("$[0].condition").value("WORN"))
                .andExpect(jsonPath("$[0].strength").value(7))
                .andExpect(jsonPath("$[0].mpBase").value(2))
                .andExpect(jsonPath("$[0].traits[0]").value("RECON"))
                .andExpect(jsonPath("$[0].entrenched").value(true));
    }

    @Test
    void nonMemberCannotListAnotherCampaignPlatoons() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/platoons", bravoCampaign.getId())
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_NOT_FOUND"));
    }

    @Test
    void playerCanReadOwnPlatoonDetail() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/platoons/{platoonId}", alphaCampaign.getId(), alliedVisiblePlatoon.getId())
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(alliedVisiblePlatoon.getId().toString()))
                .andExpect(jsonPath("$.currentTerritory.key").value("calais"))
                .andExpect(jsonPath("$.readinessStatus").value("DAMAGED"))
                .andExpect(jsonPath("$.condition").value("WORN"))
                .andExpect(jsonPath("$.strength").value(7))
                .andExpect(jsonPath("$.mpBase").value(2))
                .andExpect(jsonPath("$.traits[0]").value("RECON"))
                .andExpect(jsonPath("$.entrenched").value(true))
                .andExpect(jsonPath("$.notes").doesNotExist())
                .andExpect(jsonPath("$.hiddenFromPlayers").doesNotExist())
                .andExpect(jsonPath("$.assignedMember").doesNotExist());
    }

    @Test
    void gmCanReadGmPlatoonDetail() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/platoons/{platoonId}", alphaCampaign.getId(), alliedHiddenPlatoon.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(alliedHiddenPlatoon.getId().toString()))
                .andExpect(jsonPath("$.hiddenFromPlayers").value(true))
                .andExpect(jsonPath("$.readinessStatus").value("RESERVES"))
                .andExpect(jsonPath("$.condition").value("DEPLETED"))
                .andExpect(jsonPath("$.mpBase").value(3))
                .andExpect(jsonPath("$.traits[0]").value("ENGINEERS"))
                .andExpect(jsonPath("$.entrenched").value(false))
                .andExpect(jsonPath("$.notes").value("Hidden reserve"))
                .andExpect(jsonPath("$.assignedMember.displayName").value("gm"));
    }

    @Test
    void nonGmCannotReadOtherFactionPlatoon() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/platoons/{platoonId}", alphaCampaign.getId(), axisPlatoon.getId())
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PLATOON_NOT_FOUND"));
    }

    @Test
    void observerCannotAccessPlatoonReads() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/platoons", alphaCampaign.getId())
                        .header("X-Dev-User", "observer@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void crossCampaignPlatoonIdsAreRejected() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/platoons/{platoonId}", alphaCampaign.getId(), bravoPlatoon.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PLATOON_NOT_FOUND"));
    }

    @Test
    void playerCanCreateOwnPlatoon() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/platoons", alphaCampaign.getId())
                        .header("X-Dev-User", "allied@war.local")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "platoonKey": "allies-3",
                                  "name": "Allied Vanguard",
                                  "homeTerritoryId": "%s",
                                  "unitType": "INFANTRY",
                                  "condition": "WORN",
                                  "strength": 88,
                                  "mpBase": 2,
                                  "traits": ["RECON", "ENGINEERS"],
                                  "entrenched": true
                                }
                                """.formatted(alliedVisiblePlatoon.getHomeTerritory().getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value("allies-3"))
                .andExpect(jsonPath("$.name").value("Allied Vanguard"))
                .andExpect(jsonPath("$.currentTerritory.key").value("normandy"))
                .andExpect(jsonPath("$.readinessStatus").value("DAMAGED"))
                .andExpect(jsonPath("$.condition").value("WORN"))
                .andExpect(jsonPath("$.strength").value(88))
                .andExpect(jsonPath("$.mpBase").value(2))
                .andExpect(jsonPath("$.traits[0]").value("RECON"))
                .andExpect(jsonPath("$.traits[1]").value("ENGINEERS"))
                .andExpect(jsonPath("$.entrenched").value(true))
                .andExpect(jsonPath("$.hiddenFromPlayers").doesNotExist());

        Platoon created = platoonRepository.findByCampaignIdAndPlatoonKey(alphaCampaign.getId(), "allies-3").orElseThrow();
        PlatoonState state = platoonStateRepository.findByPlatoonIdAndCampaignIdAndTurnNumber(created.getId(), alphaCampaign.getId(), alphaCampaign.getCurrentTurnNumber()).orElseThrow();

        assertThat(created.getFaction().getId()).isEqualTo(allyPlayerMembership.getFaction().getId());
        assertThat(created.getNation().getId()).isEqualTo(allyPlayerMembership.getNation().getId());
        assertThat(created.getMetadataJson()).contains("\"mpBase\":2");
        assertThat(created.getMetadataJson()).contains("\"entrenched\":true");
        assertThat(created.getMetadataJson()).contains("\"traits\":[\"RECON\",\"ENGINEERS\"]");
        assertThat(state.getName()).isEqualTo("Allied Vanguard");
        assertThat(state.getReadinessStatus()).isEqualTo(PlatoonReadinessStatus.DAMAGED);
        assertThat(state.getStrength()).isEqualTo(88);
        assertThat(state.getHiddenFromPlayers()).isFalse();
    }

    @Test
    void playerCanUpdateOwnPlatoon() throws Exception {
        mockMvc.perform(put("/api/campaigns/{campaignId}/platoons/{platoonId}", alphaCampaign.getId(), alliedVisiblePlatoon.getId())
                        .header("X-Dev-User", "allied@war.local")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Allied Vanguard",
                                  "condition": "DEPLETED",
                                  "strength": 61,
                                  "mpBase": 3,
                                  "traits": ["ENGINEERS"],
                                  "entrenched": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Allied Vanguard"))
                .andExpect(jsonPath("$.readinessStatus").value("RESERVES"))
                .andExpect(jsonPath("$.condition").value("DEPLETED"))
                .andExpect(jsonPath("$.strength").value(61))
                .andExpect(jsonPath("$.mpBase").value(3))
                .andExpect(jsonPath("$.traits[0]").value("ENGINEERS"))
                .andExpect(jsonPath("$.entrenched").value(false));

        Platoon updated = platoonRepository.findById(alliedVisiblePlatoon.getId()).orElseThrow();
        PlatoonState state = platoonStateRepository.findByPlatoonIdAndCampaignIdAndTurnNumber(updated.getId(), alphaCampaign.getId(), alphaCampaign.getCurrentTurnNumber()).orElseThrow();

        assertThat(updated.getName()).isEqualTo("Allied Vanguard");
        assertThat(updated.getMetadataJson()).contains("\"mpBase\":3");
        assertThat(updated.getMetadataJson()).contains("\"traits\":[\"ENGINEERS\"]");
        assertThat(updated.getMetadataJson()).contains("\"entrenched\":false");
        assertThat(state.getName()).isEqualTo("Allied Vanguard");
        assertThat(state.getReadinessStatus()).isEqualTo(PlatoonReadinessStatus.RESERVES);
        assertThat(state.getStrength()).isEqualTo(61);
    }

    @Test
    void playerCannotCreatePlatoonForOtherFactionOrNation() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/platoons", alphaCampaign.getId())
                        .header("X-Dev-User", "allied@war.local")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "platoonKey": "axis-2",
                                  "name": "Axis Intrusion",
                                  "factionId": "%s",
                                  "nationId": "%s",
                                  "homeTerritoryId": "%s",
                                  "condition": "FRESH"
                                }
                                """.formatted(axisPlatoon.getFaction().getId(), axisPlatoon.getNation().getId(), alliedVisiblePlatoon.getHomeTerritory().getId())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PLATOON_FORBIDDEN"));
    }

    @Test
    void playerCannotUpdatePlatoonFromOtherFactionOrNation() throws Exception {
        mockMvc.perform(put("/api/campaigns/{campaignId}/platoons/{platoonId}", alphaCampaign.getId(), axisPlatoon.getId())
                        .header("X-Dev-User", "allied@war.local")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Axis Intrusion",
                                  "condition": "FRESH",
                                  "strength": 77
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("PLATOON_FORBIDDEN"));
    }

    private User saveUser(String email, String displayName) {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setActive(true);
        return userRepository.save(user);
    }

    private Campaign saveCampaign(String name, User createdBy, int currentTurnNumber) {
        Campaign campaign = new Campaign();
        campaign.setName(name);
        campaign.setCurrentPhase(CampaignPhase.OPERATIONS);
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
        territory.setBaseIndustry(2);
        territory.setBaseManpower(3);
        territory.setHasPort(false);
        territory.setHasAirfield(false);
        territory.setMaxFortLevel(4);
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
                                String name,
                                String unitType,
                                boolean hiddenFromPlayers) {
        return savePlatoon(campaign, faction, nation, assignedMember, homeTerritory, key, name, unitType, hiddenFromPlayers, null);
    }

    private Platoon savePlatoon(Campaign campaign,
                                Faction faction,
                                Nation nation,
                                CampaignMember assignedMember,
                                Territory homeTerritory,
                                String key,
                                String name,
                                String unitType,
                                boolean hiddenFromPlayers,
                                String metadataJson) {
        Platoon platoon = new Platoon();
        platoon.setCampaign(campaign);
        platoon.setFaction(faction);
        platoon.setNation(nation);
        platoon.setAssignedMember(assignedMember);
        platoon.setHomeTerritory(homeTerritory);
        platoon.setPlatoonKey(key);
        platoon.setName(name);
        platoon.setUnitType(unitType);
        platoon.setHiddenFromPlayers(hiddenFromPlayers);
        platoon.setMetadataJson(metadataJson);
        return platoonRepository.save(platoon);
    }

    private PlatoonState savePlatoonState(Turn turn,
                                          Platoon platoon,
                                          Territory territory,
                                          PlatoonReadinessStatus readinessStatus,
                                          int strength,
                                          String notes) {
        return savePlatoonState(turn, platoon, territory, readinessStatus, strength, notes, null, null);
    }

    private PlatoonState savePlatoonState(Turn turn,
                                          Platoon platoon,
                                          Territory territory,
                                          PlatoonReadinessStatus readinessStatus,
                                          int strength,
                                          String notes,
                                          String name,
                                          Boolean hiddenFromPlayers) {
        PlatoonState state = new PlatoonState();
        state.setTurn(turn);
        state.setPlatoon(platoon);
        state.setTerritory(territory);
        state.setName(name);
        state.setReadinessStatus(readinessStatus);
        state.setStrength(strength);
        state.setHiddenFromPlayers(hiddenFromPlayers);
        state.setNotes(notes);
        return platoonStateRepository.save(state);
    }
}
