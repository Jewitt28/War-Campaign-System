package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.BattleMode;
import com.warcampaign.backend.domain.enums.BattleParticipantSide;
import com.warcampaign.backend.domain.enums.BattleStatus;
import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.model.Battle;
import com.warcampaign.backend.domain.model.BattleParticipant;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignBattleIntegrationTest {

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

    private Campaign campaign;
    private Campaign otherCampaign;
    private Battle battle;
    private User gmUser;
    private User playerUser;
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

        gmUser = saveUser("gm@war.local", "gm");
        playerUser = saveUser("player@war.local", "player");
        User outsiderUser = saveUser("outsider@war.local", "outsider");

        campaign = saveCampaign("Battle Front", gmUser);
        otherCampaign = saveCampaign("Other Front", outsiderUser);

        Theatre theatre = saveTheatre(campaign, "west", "Western Europe", 1);
        Theatre otherTheatre = saveTheatre(otherCampaign, "east", "Eastern Europe", 1);
        Faction allies = saveFaction(campaign, "allies", "Allies");
        Faction axis = saveFaction(campaign, "axis", "Axis");
        Faction otherFaction = saveFaction(otherCampaign, "other", "Other");
        Nation british = saveNation(campaign, allies, "uk", "United Kingdom");
        Nation german = saveNation(campaign, axis, "de", "Germany");
        Nation soviet = saveNation(otherCampaign, otherFaction, "su", "Soviet Union");

        CampaignMember gmMembership = saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        CampaignMember playerMembership = saveMembership(campaign, playerUser, CampaignRole.PLAYER, allies, british);
        saveMembership(otherCampaign, outsiderUser, CampaignRole.GM, otherFaction, soviet);

        Territory normandy = saveTerritory(campaign, theatre, "normandy", "Normandy");
        Territory calais = saveTerritory(campaign, theatre, "calais", "Calais");
        Territory minsk = saveTerritory(otherCampaign, otherTheatre, "minsk", "Minsk");

        Turn turn = saveTurn(campaign, 1, CampaignPhase.RESOLUTION);
        saveTurn(otherCampaign, 1, CampaignPhase.RESOLUTION);

        alliedPlatoon = savePlatoon(campaign, allies, british, playerMembership, normandy, "allied-1", "Allied 1st Platoon");
        axisPlatoon = savePlatoon(campaign, axis, german, null, calais, "axis-1", "Axis 1st Platoon");
        savePlatoon(campaign, allies, british, gmMembership, normandy, "allied-2", "Allied 2nd Platoon");
        savePlatoon(otherCampaign, otherFaction, soviet, null, minsk, "other-1", "Other 1st Platoon");

        savePlatoonState(turn, alliedPlatoon, normandy, PlatoonReadinessStatus.ACTIVE, 8);
        savePlatoonState(turn, axisPlatoon, calais, PlatoonReadinessStatus.ACTIVE, 9);

        battle = new Battle();
        battle.setCampaign(campaign);
        battle.setTurnNumber(1);
        battle.setTerritory(calais);
        battle.setBattleStatus(BattleStatus.PENDING);
        battle.setBattleMode(BattleMode.TABLETOP);
        battle.setAttackerFaction(allies);
        battle.setDefenderFaction(axis);
        battle = battleRepository.save(battle);

        saveBattleParticipant(battle, alliedPlatoon, BattleParticipantSide.ATTACKER, "ACTIVE");
        saveBattleParticipant(battle, axisPlatoon, BattleParticipantSide.DEFENDER, "ACTIVE");
    }

    @Test
    void memberCanReadBattleDetail() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/battles/{battleId}", campaign.getId(), battle.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.battleId").value(battle.getId().toString()))
                .andExpect(jsonPath("$.battleStatus").value("PENDING"))
                .andExpect(jsonPath("$.participants.length()").value(2));
    }

    @Test
    void nonMemberCannotReadBattleDetail() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/battles/{battleId}", campaign.getId(), battle.getId())
                        .header("X-Dev-User", "outsider@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_NOT_FOUND"));
    }

    @Test
    void gmCanRecordBattleResult() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/battles/{battleId}/result", campaign.getId(), battle.getId())
                        .header("X-Dev-User", "gm@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "tabletopResultSummary": "Attacker victory after six rounds.",
                                  "winnerFactionId": "%s",
                                  "participantResults": [
                                    {
                                      "platoonId": "%s",
                                      "postConditionBand": "WORN"
                                    },
                                    {
                                      "platoonId": "%s",
                                      "postConditionBand": "SHATTERED"
                                    }
                                  ]
                                }
                                """.formatted(
                                battle.getAttackerFaction().getId(),
                                alliedPlatoon.getId(),
                                axisPlatoon.getId()
                        )))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.battleStatus").value("RESOLVED"))
                .andExpect(jsonPath("$.tabletopResultSummary").value("Attacker victory after six rounds."))
                .andExpect(jsonPath("$.participants[0].postConditionBand").value("WORN"))
                .andExpect(jsonPath("$.participants[1].postConditionBand").value("SHATTERED"));

        Battle persistedBattle = battleRepository.findById(battle.getId()).orElseThrow();
        assertThat(persistedBattle.getBattleStatus()).isEqualTo(BattleStatus.RESOLVED);
        assertThat(persistedBattle.getStrategicResultJson()).contains(battle.getAttackerFaction().getId().toString());
        assertThat(resolutionEventRepository.findAll()).hasSize(1);
        assertThat(notificationRepository.findAll()).hasSize(2);
    }

    @Test
    void nonGmCannotRecordBattleResult() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/battles/{battleId}/result", campaign.getId(), battle.getId())
                        .header("X-Dev-User", "player@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "tabletopResultSummary": "Attempted player result."
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void crossCampaignBattleLookupIsRejected() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}/battles/{battleId}", otherCampaign.getId(), battle.getId())
                        .header("X-Dev-User", "outsider@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BATTLE_NOT_FOUND"));
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
        territory.setMaxFortLevel(2);
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

    private BattleParticipant saveBattleParticipant(Battle battle,
                                                    Platoon platoon,
                                                    BattleParticipantSide side,
                                                    String preConditionBand) {
        BattleParticipant participant = new BattleParticipant();
        participant.setBattle(battle);
        participant.setPlatoon(platoon);
        participant.setSide(side);
        participant.setPreConditionBand(preConditionBand);
        return battleParticipantRepository.save(participant);
    }
}
