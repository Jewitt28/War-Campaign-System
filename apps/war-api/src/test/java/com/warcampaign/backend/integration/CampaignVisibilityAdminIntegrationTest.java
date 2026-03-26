package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
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
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignVisibilityAdminIntegrationTest {

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

    private Campaign campaign;
    private Faction allies;
    private Faction axis;
    private Nation british;
    private Territory normandy;
    private Territory calais;
    private CampaignMember alliedMembership;

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

        User gmUser = saveUser("gm@war.local", "gm");
        User alliedUser = saveUser("allied@war.local", "ally");
        User axisUser = saveUser("axis@war.local", "axis");

        campaign = saveCampaign("Visibility Front", gmUser);
        Theatre theatre = saveTheatre(campaign, "west", "Western Europe", 1);
        allies = saveFaction(campaign, "allies", "Allies");
        axis = saveFaction(campaign, "axis", "Axis");
        british = saveNation(campaign, allies, "uk", "United Kingdom");
        Nation german = saveNation(campaign, axis, "de", "Germany");

        saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        alliedMembership = saveMembership(campaign, alliedUser, CampaignRole.PLAYER, allies, british);
        saveMembership(campaign, axisUser, CampaignRole.PLAYER, axis, german);

        normandy = saveTerritory(campaign, theatre, "normandy", "Normandy");
        calais = saveTerritory(campaign, theatre, "calais", "Calais");

        Turn turn = saveTurn(campaign, 1, CampaignPhase.STRATEGIC);
        saveTerritoryState(turn, normandy, allies, british, TerritoryStrategicStatus.CONTROLLED);
        saveTerritoryState(turn, calais, axis, german, TerritoryStrategicStatus.CONTROLLED);

        Platoon alliedPlatoon = savePlatoon(campaign, allies, british, alliedMembership, normandy, "allied-1", "Allied 1st Platoon");
        savePlatoonState(turn, alliedPlatoon, normandy, PlatoonReadinessStatus.ACTIVE, 8);
    }

    @Test
    void gmCanRebuildVisibilityAndPlayerMapIsScoped() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/visibility/rebuild", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.viewerFactionCount").value(2))
                .andExpect(jsonPath("$.visibilityRowCount").value(4));

        mockMvc.perform(get("/api/campaigns/{campaignId}/map", campaign.getId())
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.territories.length()").value(1))
                .andExpect(jsonPath("$.territories[0].key").value("normandy"));
    }

    @Test
    void playerCannotReadHiddenTerritoryAfterVisibilityRebuild() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/visibility/rebuild", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/campaigns/{campaignId}/territories/{territoryId}", campaign.getId(), calais.getId())
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TERRITORY_NOT_FOUND"));
    }

    @Test
    void nonGmCannotUseAdminVisibilityAuditOrSnapshotEndpoints() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/visibility/rebuild", campaign.getId())
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));

        mockMvc.perform(get("/api/campaigns/{campaignId}/audit", campaign.getId())
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));

        mockMvc.perform(post("/api/campaigns/{campaignId}/snapshots/export", campaign.getId())
                        .header("X-Dev-User", "allied@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void gmCanReadAuditAndExportSnapshot() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/phase/advance", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/campaigns/{campaignId}/audit", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].actionType").value("CAMPAIGN_PHASE_ADVANCED"));

        mockMvc.perform(post("/api/campaigns/{campaignId}/snapshots/export", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.campaignId").value(campaign.getId().toString()))
                .andExpect(jsonPath("$.members.length()").value(3))
                .andExpect(jsonPath("$.territories.length()").value(2))
                .andExpect(jsonPath("$.platoons.length()").value(1))
                .andExpect(jsonPath("$.auditLog.length()").value(1));
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
        savedCampaign.setCurrentPhase(CampaignPhase.STRATEGIC);
        savedCampaign.setCurrentTurnNumber(1);
        savedCampaign.setCampaignStatus(CampaignStatus.ACTIVE);
        savedCampaign.setRulesetVersion("alpha-1");
        savedCampaign.setPhaseStartedAt(Instant.parse("2026-03-26T12:00:00Z"));
        savedCampaign.setCreatedBy(createdBy);
        return campaignRepository.save(savedCampaign);
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

    private Territory saveTerritory(Campaign campaign, Theatre theatre, String key, String name) {
        Territory territory = new Territory();
        territory.setCampaign(campaign);
        territory.setTheatre(theatre);
        territory.setTerritoryKey(key);
        territory.setName(name);
        territory.setTerrainType("PLAINS");
        territory.setBaseIndustry(1);
        territory.setBaseManpower(1);
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

    private TerritoryState saveTerritoryState(Turn turn, Territory territory, Faction faction, Nation nation, TerritoryStrategicStatus status) {
        TerritoryState territoryState = new TerritoryState();
        territoryState.setTurn(turn);
        territoryState.setTerritory(territory);
        territoryState.setControllingFaction(faction);
        territoryState.setControllerNation(nation);
        territoryState.setStrategicStatus(status);
        territoryState.setFortLevel(1);
        territoryState.setPartisanRisk(0);
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
        return platoonRepository.save(platoon);
    }

    private PlatoonState savePlatoonState(Turn turn, Platoon platoon, Territory territory, PlatoonReadinessStatus readinessStatus, int strength) {
        PlatoonState state = new PlatoonState();
        state.setTurn(turn);
        state.setPlatoon(platoon);
        state.setTerritory(territory);
        state.setReadinessStatus(readinessStatus);
        state.setStrength(strength);
        return platoonStateRepository.save(state);
    }
}
