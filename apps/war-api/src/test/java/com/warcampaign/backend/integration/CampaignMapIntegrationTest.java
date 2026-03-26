package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.*;
import com.warcampaign.backend.domain.model.*;
import com.warcampaign.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignMapIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BattleParticipantRepository battleParticipantRepository;

    @Autowired
    private BattleRepository battleRepository;

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
    private PlatoonRepository platoonRepository;

    @Autowired
    private TerritoryStateRepository territoryStateRepository;

    @Autowired
    private TerritoryRepository territoryRepository;

    @Autowired
    private NationRepository nationRepository;

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

    private Campaign alphaCampaign;
    private Campaign bravoCampaign;
    private Territory alphaTerritory;
    private Territory bravoTerritory;
    private User gmUser;
    private User playerUser;

    @BeforeEach
    void setup() {
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

        gmUser = saveUser("gm@war.local", "gm");
        playerUser = saveUser("player@war.local", "player");
        User outsiderUser = saveUser("outsider@war.local", "outsider");

        alphaCampaign = saveCampaign("Alpha Front", gmUser, 2);
        bravoCampaign = saveCampaign("Bravo Front", outsiderUser, 1);

        saveMembership(alphaCampaign, gmUser, CampaignRole.GM);
        saveMembership(alphaCampaign, playerUser, CampaignRole.PLAYER);
        saveMembership(bravoCampaign, outsiderUser, CampaignRole.GM);

        Theatre alphaTheatre = saveTheatre(alphaCampaign, "west", "Western Europe", 1);
        Theatre bravoTheatre = saveTheatre(bravoCampaign, "east", "Eastern Europe", 1);

        Faction allies = saveFaction(alphaCampaign, "allies", "Allies");
        Faction axis = saveFaction(alphaCampaign, "axis", "Axis");
        Faction bravoFaction = saveFaction(bravoCampaign, "soviet", "Soviet Union");

        Nation british = saveNation(alphaCampaign, allies, "uk", "United Kingdom");
        saveNation(alphaCampaign, axis, "de", "Germany");
        Nation soviet = saveNation(bravoCampaign, bravoFaction, "su", "Soviet Union");

        alphaTerritory = saveTerritory(alphaCampaign, alphaTheatre, "normandy", "Normandy");
        Territory alphaSecondTerritory = saveTerritory(alphaCampaign, alphaTheatre, "calais", "Calais");
        bravoTerritory = saveTerritory(bravoCampaign, bravoTheatre, "smolensk", "Smolensk");

        Turn alphaTurn1 = saveTurn(alphaCampaign, 1);
        Turn alphaTurn2 = saveTurn(alphaCampaign, 2);
        Turn bravoTurn1 = saveTurn(bravoCampaign, 1);

        saveTerritoryState(alphaTurn1, alphaTerritory, allies, british, TerritoryStrategicStatus.NEUTRAL, 0, "STRAINED", 1, "old notes");
        saveTerritoryState(alphaTurn2, alphaTerritory, allies, british, TerritoryStrategicStatus.CONTROLLED, 2, "SUPPLIED", 3, "GM note alpha");
        saveTerritoryState(alphaTurn2, alphaSecondTerritory, axis, null, TerritoryStrategicStatus.CONTESTED, 1, "STRAINED", 4, "GM note beta");
        saveTerritoryState(bravoTurn1, bravoTerritory, bravoFaction, soviet, TerritoryStrategicStatus.CONTROLLED, 1, "SUPPLIED", 0, "GM note bravo");
    }

    @Test
    void memberCanReadMapForOwnCampaign() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/map", alphaCampaign.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.campaignId").value(alphaCampaign.getId().toString()))
                .andExpect(jsonPath("$.currentTurnNumber").value(2))
                .andExpect(jsonPath("$.territories.length()").value(2))
                .andExpect(jsonPath("$.territories[?(@.key=='normandy')].strategicStatus").value("CONTROLLED"));
    }

    @Test
    void nonMemberCannotReadAnotherCampaignMap() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/map", bravoCampaign.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_NOT_FOUND"));
    }

    @Test
    void memberCanReadPlayerSafeTerritoryDetail() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/territories/{territoryId}", alphaCampaign.getId(), alphaTerritory.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(alphaTerritory.getId().toString()))
                .andExpect(jsonPath("$.strategicStatus").value("CONTROLLED"))
                .andExpect(jsonPath("$.theatre.key").value("west"))
                .andExpect(jsonPath("$.notes").doesNotExist())
                .andExpect(jsonPath("$.damageJson").doesNotExist())
                .andExpect(jsonPath("$.metadataJson").doesNotExist());
    }

    @Test
    void gmCanReadGmTerritoryDetail() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/territories/{territoryId}/gm", alphaCampaign.getId(), alphaTerritory.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes").value("GM note alpha"))
                .andExpect(jsonPath("$.partisanRisk").value(3))
                .andExpect(jsonPath("$.metadataJson").value("{\"priority\":\"high\"}"));
    }

    @Test
    void nonGmCannotAccessGmTerritoryDetail() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/territories/{territoryId}/gm", alphaCampaign.getId(), alphaTerritory.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void crossCampaignTerritoryIdsAreRejected() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/territories/{territoryId}", alphaCampaign.getId(), bravoTerritory.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TERRITORY_NOT_FOUND"));
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

    private CampaignMember saveMembership(Campaign campaign, User user, CampaignRole role) {
        CampaignMember membership = new CampaignMember();
        membership.setCampaign(campaign);
        membership.setUser(user);
        membership.setRole(role);
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
        faction.setColor("#333333");
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
        territory.setStrategicTagsJson("[\"frontline\"]");
        territory.setBaseIndustry(2);
        territory.setBaseManpower(3);
        territory.setHasPort(false);
        territory.setHasAirfield(true);
        territory.setMaxFortLevel(5);
        territory.setMetadataJson("{\"priority\":\"high\"}");
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

    private TerritoryState saveTerritoryState(Turn turn,
                                              Territory territory,
                                              Faction controllingFaction,
                                              Nation controllerNation,
                                              TerritoryStrategicStatus strategicStatus,
                                              int fortLevel,
                                              String supplyStatus,
                                              int partisanRisk,
                                              String notes) {
        TerritoryState state = new TerritoryState();
        state.setTurn(turn);
        state.setTerritory(territory);
        state.setControllingFaction(controllingFaction);
        state.setControllerNation(controllerNation);
        state.setStrategicStatus(strategicStatus);
        state.setFortLevel(fortLevel);
        state.setSupplyStatus(supplyStatus);
        state.setPartisanRisk(partisanRisk);
        state.setDamageJson("{\"bridges\":0}");
        state.setNotes(notes);
        return territoryStateRepository.save(state);
    }
}
