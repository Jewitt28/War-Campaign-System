package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.Theatre;
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
import com.warcampaign.backend.repository.TerritoryRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import com.warcampaign.backend.repository.TheatreRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.repository.VisibilityStateRepository;
import com.warcampaign.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignMapBridgeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CampaignRepository campaignRepository;
    @Autowired
    private CampaignMemberRepository campaignMemberRepository;
    @Autowired
    private CampaignInviteRepository campaignInviteRepository;
    @Autowired
    private CampaignAuditLogRepository campaignAuditLogRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private VisibilityStateRepository visibilityStateRepository;
    @Autowired
    private ResolutionEventRepository resolutionEventRepository;
    @Autowired
    private BattleParticipantRepository battleParticipantRepository;
    @Autowired
    private BattleRepository battleRepository;
    @Autowired
    private PlatoonOrderRepository platoonOrderRepository;
    @Autowired
    private OrderSubmissionRepository orderSubmissionRepository;
    @Autowired
    private TerritoryStateRepository territoryStateRepository;
    @Autowired
    private PlatoonStateRepository platoonStateRepository;
    @Autowired
    private PlatoonRepository platoonRepository;
    @Autowired
    private NationRepository nationRepository;
    @Autowired
    private FactionRepository factionRepository;
    @Autowired
    private TerritoryRepository territoryRepository;
    @Autowired
    private TheatreRepository theatreRepository;
    @Autowired
    private TurnRepository turnRepository;

    private Campaign campaign;
    private Nation britishNation;

    @BeforeEach
    void setup() {
        notificationRepository.deleteAll();
        visibilityStateRepository.deleteAll();
        resolutionEventRepository.deleteAll();
        battleParticipantRepository.deleteAll();
        battleRepository.deleteAll();
        platoonOrderRepository.deleteAll();
        orderSubmissionRepository.deleteAll();
        campaignAuditLogRepository.deleteAll();
        territoryStateRepository.deleteAll();
        platoonStateRepository.deleteAll();
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

        User gmUser = saveUser("gm@war.local", "GM One");
        User playerUser = saveUser("player@war.local", "Player One");
        saveUser("outsider@war.local", "Outsider");

        campaign = saveCampaign("Bridge Front", gmUser);
        saveTheatre(campaign, "WE", "Western Europe", 1, true);
        saveTheatre(campaign, "EE", "Eastern Europe", 2, true);

        Faction allies = saveFaction(campaign, "allies", "Allies", "#2244aa");
        Faction axis = saveFaction(campaign, "axis", "Axis", "#772222");
        britishNation = saveNation(campaign, allies, "great_britain", "Great Britain", null);
        saveNation(campaign, axis, "germany", "Germany", null);

        saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        saveMembership(campaign, playerUser, CampaignRole.PLAYER, allies, britishNation);
    }

    @Test
    void gmCanPersistSetupBridgeState() throws Exception {
        mockMvc.perform(put("/api/campaigns/{campaignId}/map/bridge/setup", campaign.getId())
                        .header("X-Dev-User", "gm@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "useDefaultFactions": true,
                                  "activeTheatres": {
                                    "WE": true,
                                    "EE": false
                                  },
                                  "nationsEnabled": {
                                    "great_britain": true,
                                    "custom:test_nation": true
                                  },
                                  "customFactions": [
                                    {
                                      "id": "coalition",
                                      "name": "Coalition",
                                      "color": "#556677"
                                    }
                                  ],
                                  "customNations": [
                                    {
                                      "key": "custom:test_nation",
                                      "name": "Free State",
                                      "defaultFactionKey": "custom:coalition",
                                      "color": "#22c55e"
                                    }
                                  ],
                                  "homelandsByNation": {
                                    "great_britain": "WE-01",
                                    "custom:test_nation": "EE-03"
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.useDefaultFactions").value(true))
                .andExpect(jsonPath("$.activeTheatres.EE").value(false))
                .andExpect(jsonPath("$.customFactions[0].key").value("custom:coalition"))
                .andExpect(jsonPath("$.customNations[0].key").value("custom:test_nation"))
                .andExpect(jsonPath("$.homelandsByNation.great_britain").value("WE-01"))
                .andExpect(jsonPath("$.homelandsByNation['custom:test_nation']").value("EE-03"));

        Faction customFaction = factionRepository.findByCampaignIdAndFactionKey(campaign.getId(), "custom:coalition").orElseThrow();
        Nation customNation = nationRepository.findByCampaignIdAndNationKey(campaign.getId(), "custom:test_nation").orElseThrow();
        Theatre easternEurope = theatreRepository.findByCampaignIdAndTheatreKey(campaign.getId(), "EE").orElseThrow();

        assertThat(customFaction.getName()).isEqualTo("Coalition");
        assertThat(customNation.getFaction().getId()).isEqualTo(customFaction.getId());
        assertThat(customNation.getMetadataJson()).contains("\"color\":\"#22c55e\"");
        assertThat(customNation.getMetadataJson()).contains("\"homelandTerritoryKey\":\"EE-03\"");
        assertThat(easternEurope.isActive()).isFalse();
    }

    @Test
    void playerCannotPersistSetupBridgeState() throws Exception {
        mockMvc.perform(put("/api/campaigns/{campaignId}/map/bridge/setup", campaign.getId())
                        .header("X-Dev-User", "player@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "useDefaultFactions": true,
                                  "activeTheatres": {},
                                  "nationsEnabled": {
                                    "great_britain": true
                                  },
                                  "customFactions": [],
                                  "customNations": [],
                                  "homelandsByNation": {}
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void playerCanPersistOwnNationStateButNotAnotherNation() throws Exception {
        mockMvc.perform(put("/api/campaigns/{campaignId}/map/bridge/nation-states", campaign.getId())
                        .header("X-Dev-User", "player@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nationStates": {
                                    "great_britain": {
                                      "supplies": 14,
                                      "manpower": 33,
                                      "resourcePoints": 6,
                                      "economyPool": {
                                        "industry": 8,
                                        "political": 4,
                                        "logistics": 5,
                                        "intelligence": 3
                                      },
                                      "researchState": {
                                        "activeResearchId": "RES_SUPPLY_NET",
                                        "progressTurns": 1,
                                        "completedResearch": []
                                      },
                                      "doctrineState": {
                                        "activeStanceId": "DOC_MOBILE_WARFARE",
                                        "equippedTraitIds": [],
                                        "traitSlots": 3
                                      },
                                      "upgradesState": {
                                        "applied": []
                                      }
                                    }
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nationStates.great_britain.supplies").value(14))
                .andExpect(jsonPath("$.nationStates.great_britain.resourcePoints").value(6));

        Nation persisted = nationRepository.findByCampaignIdAndNationKey(campaign.getId(), "great_britain").orElseThrow();
        assertThat(persisted.getMetadataJson()).contains("\"supplies\":14");
        assertThat(persisted.getMetadataJson()).contains("\"resourcePoints\":6");

        mockMvc.perform(put("/api/campaigns/{campaignId}/map/bridge/nation-states", campaign.getId())
                        .header("X-Dev-User", "player@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nationStates": {
                                    "germany": {
                                      "supplies": 99
                                    }
                                  }
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void memberCanPostAndReadWorldChat() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/world-chat", campaign.getId())
                        .header("X-Dev-User", "player@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "message": "Enemy movement spotted near the coast."
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.authorDisplayName").value("Player One"))
                .andExpect(jsonPath("$.message").value("Enemy movement spotted near the coast."));

        mockMvc.perform(get("/api/campaigns/{campaignId}/world-chat", campaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].authorDisplayName").value("Player One"))
                .andExpect(jsonPath("$[0].message").value("Enemy movement spotted near the coast."));
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
        savedCampaign.setCampaignStatus(CampaignStatus.DRAFT);
        savedCampaign.setCreatedBy(createdBy);
        return campaignRepository.save(savedCampaign);
    }

    private Theatre saveTheatre(Campaign campaign, String key, String name, int displayOrder, boolean active) {
        Theatre theatre = new Theatre();
        theatre.setCampaign(campaign);
        theatre.setTheatreKey(key);
        theatre.setName(name);
        theatre.setDisplayOrder(displayOrder);
        theatre.setActive(active);
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

    private Nation saveNation(Campaign campaign, Faction faction, String key, String name, String metadataJson) {
        Nation nation = new Nation();
        nation.setCampaign(campaign);
        nation.setFaction(faction);
        nation.setNationKey(key);
        nation.setName(name);
        nation.setMetadataJson(metadataJson);
        return nationRepository.save(nation);
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
}
