package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.repository.CampaignInviteRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignLobbyIntegrationTest {

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
    private FactionRepository factionRepository;

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

    private User gmUser;
    private User playerUser;
    private User outsiderUser;
    private Campaign alphaCampaign;
    private Campaign bravoCampaign;
    private CampaignMember alphaGmMembership;
    private CampaignMember alphaPlayerMembership;
    private CampaignMember bravoPlayerMembership;

    @BeforeEach
    void setup() {
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

        gmUser = saveUser("gm@war.local", "gm");
        playerUser = saveUser("player@war.local", "player");
        outsiderUser = saveUser("outsider@war.local", "outsider");

        alphaCampaign = saveCampaign("Alpha Front", gmUser);
        bravoCampaign = saveCampaign("Bravo Front", outsiderUser);

        alphaGmMembership = saveMembership(alphaCampaign, gmUser, CampaignRole.GM);
        alphaPlayerMembership = saveMembership(alphaCampaign, playerUser, CampaignRole.PLAYER);
        bravoPlayerMembership = saveMembership(bravoCampaign, outsiderUser, CampaignRole.PLAYER);

        saveFaction(alphaCampaign, "allies", "Allies");
        saveFaction(alphaCampaign, "axis", "Axis");
    }

    @Test
    void memberCanListOnlyTheirCampaigns() throws Exception {
        mockMvc.perform(get("/api/campaigns")
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(alphaCampaign.getId().toString()))
                .andExpect(jsonPath("$[0].name").value("Alpha Front"))
                .andExpect(jsonPath("$[0].myRole").value("PLAYER"));
    }

    @Test
    void memberCanAccessTheirOwnCampaignDetail() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}", alphaCampaign.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(alphaCampaign.getId().toString()))
                .andExpect(jsonPath("$.name").value("Alpha Front"))
                .andExpect(jsonPath("$.myMembership.role").value("PLAYER"))
                .andExpect(jsonPath("$.memberCount").value(2))
                .andExpect(jsonPath("$.factions.length()").value(2));
    }

    @Test
    void nonMemberCannotAccessAnotherCampaign() throws Exception {
        mockMvc.perform(get("/api/campaigns/{campaignId}", bravoCampaign.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_NOT_FOUND"));
    }

    @Test
    void gmCanUpdateMemberAssignments() throws Exception {
        mockMvc.perform(patch("/api/campaigns/{campaignId}/members/{memberId}", alphaCampaign.getId(), alphaPlayerMembership.getId())
                        .header("X-Dev-User", "gm@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "OBSERVER",
                                  "factionId": null,
                                  "nationId": null
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(alphaPlayerMembership.getId().toString()))
                .andExpect(jsonPath("$.role").value("OBSERVER"))
                .andExpect(jsonPath("$.factionId").isEmpty())
                .andExpect(jsonPath("$.nationId").isEmpty());

        CampaignMember updated = campaignMemberRepository.findById(alphaPlayerMembership.getId()).orElseThrow();
        assertThat(updated.getRole()).isEqualTo(CampaignRole.OBSERVER);
    }

    @Test
    void nonGmCannotUpdateMemberAssignments() throws Exception {
        mockMvc.perform(patch("/api/campaigns/{campaignId}/members/{memberId}", alphaCampaign.getId(), alphaGmMembership.getId())
                        .header("X-Dev-User", "player@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "PLAYER"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void crossCampaignUpdateAttemptsAreRejected() throws Exception {
        mockMvc.perform(patch("/api/campaigns/{campaignId}/members/{memberId}", alphaCampaign.getId(), bravoPlayerMembership.getId())
                        .header("X-Dev-User", "gm@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "OBSERVER"
                                }
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_MEMBER_NOT_FOUND"));
    }

    private User saveUser(String email, String displayName) {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setActive(true);
        return userRepository.save(user);
    }

    private Campaign saveCampaign(String name, User createdBy) {
        Campaign campaign = new Campaign();
        campaign.setName(name);
        campaign.setCurrentPhase(CampaignPhase.LOBBY);
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

    private Faction saveFaction(Campaign campaign, String key, String name) {
        Faction faction = new Faction();
        faction.setCampaign(campaign);
        faction.setFactionKey(key);
        faction.setName(name);
        return factionRepository.save(faction);
    }
}
