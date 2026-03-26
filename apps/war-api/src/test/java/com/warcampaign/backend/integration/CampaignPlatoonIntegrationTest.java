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

    private Campaign alphaCampaign;
    private Campaign bravoCampaign;
    private CampaignMember allyPlayerMembership;
    private Platoon alliedVisiblePlatoon;
    private Platoon alliedHiddenPlatoon;
    private Platoon axisPlatoon;
    private Platoon bravoPlatoon;

    @BeforeEach
    void setup() {
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

        alliedVisiblePlatoon = savePlatoon(alphaCampaign, allies, british, allyPlayerMembership, normandy, "allies-1", "Allied 1st Platoon", "INFANTRY", false);
        alliedHiddenPlatoon = savePlatoon(alphaCampaign, allies, british, gmMembership, normandy, "allies-2", "Allied Reserve Platoon", "RESERVE", true);
        axisPlatoon = savePlatoon(alphaCampaign, axis, german, null, calais, "axis-1", "Axis 1st Platoon", "ARMOR", false);
        bravoPlatoon = savePlatoon(bravoCampaign, soviets, soviet, bravoGmMembership, smolensk, "soviet-1", "Soviet 1st Platoon", "INFANTRY", false);

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
                .andExpect(jsonPath("$[0].strength").value(7));
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
                .andExpect(jsonPath("$.strength").value(7))
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
        return platoonRepository.save(platoon);
    }

    private PlatoonState savePlatoonState(Turn turn,
                                          Platoon platoon,
                                          Territory territory,
                                          PlatoonReadinessStatus readinessStatus,
                                          int strength,
                                          String notes) {
        PlatoonState state = new PlatoonState();
        state.setTurn(turn);
        state.setPlatoon(platoon);
        state.setTerritory(territory);
        state.setReadinessStatus(readinessStatus);
        state.setStrength(strength);
        state.setNotes(notes);
        return platoonStateRepository.save(state);
    }
}
