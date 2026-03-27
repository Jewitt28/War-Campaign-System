package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.InviteStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignInvite;
import com.warcampaign.backend.domain.model.CampaignMember;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CampaignManagementIntegrationTest {

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
    private FactionRepository factionRepository;

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
    private ResolutionEventRepository resolutionEventRepository;

    @Autowired
    private VisibilityStateRepository visibilityStateRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    private User gmUser;
    private User playerUser;
    private Campaign existingCampaign;

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
        existingCampaign = saveCampaign("Alpha Front", gmUser);
        saveMembership(existingCampaign, gmUser, CampaignRole.GM);
        saveMembership(existingCampaign, playerUser, CampaignRole.PLAYER);
    }

    @Test
    void authenticatedUserCanCreateCampaignAndBecomeGm() throws Exception {
        mockMvc.perform(post("/api/campaigns")
                        .header("X-Dev-User", "gm@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Bravo Front"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.campaignName").value("Bravo Front"))
                .andExpect(jsonPath("$.campaignStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.currentPhase").value("LOBBY"))
                .andExpect(jsonPath("$.currentTurnNumber").value(1));

        List<Campaign> campaigns = campaignRepository.findAll();
        Campaign createdCampaign = campaigns.stream()
                .filter(campaign -> "Bravo Front".equals(campaign.getName()))
                .findFirst()
                .orElseThrow();

        CampaignMember gmMembership = campaignMemberRepository
                .findByCampaignAndUser(createdCampaign, gmUser)
                .orElseThrow();

        assertThat(createdCampaign.getCampaignStatus()).isEqualTo(CampaignStatus.ACTIVE);
        assertThat(gmMembership.getRole()).isEqualTo(CampaignRole.GM);
    }

    @Test
    void gmCanCreateListAndRevokeInvites() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/invites", existingCampaign.getId())
                        .header("X-Dev-User", "gm@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inviteeEmail": "observer@war.local",
                                  "intendedRole": "OBSERVER",
                                  "expiresInDays": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inviteeEmail").value("observer@war.local"))
                .andExpect(jsonPath("$.intendedRole").value("OBSERVER"))
                .andExpect(jsonPath("$.status").value("PENDING"));

        CampaignInvite invite = campaignInviteRepository.findAll().get(0);

        mockMvc.perform(get("/api/campaigns/{campaignId}/invites", existingCampaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].inviteId").value(invite.getId().toString()))
                .andExpect(jsonPath("$[0].inviteToken").value(invite.getInviteToken()));

        mockMvc.perform(post("/api/campaigns/{campaignId}/invites/{inviteId}/revoke", existingCampaign.getId(), invite.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVOKED"));

        CampaignInvite revokedInvite = campaignInviteRepository.findById(invite.getId()).orElseThrow();
        assertThat(revokedInvite.getStatus()).isEqualTo(InviteStatus.REVOKED);
    }

    @Test
    void nonGmCannotManageInvitesOrLifecycle() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/invites", existingCampaign.getId())
                        .header("X-Dev-User", "player@war.local")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inviteeEmail": "outsider@war.local",
                                  "intendedRole": "PLAYER",
                                  "expiresInDays": 7
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));

        mockMvc.perform(post("/api/campaigns/{campaignId}/archive", existingCampaign.getId())
                        .header("X-Dev-User", "player@war.local"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CAMPAIGN_FORBIDDEN"));
    }

    @Test
    void gmCanCompleteArchiveAndResetCampaign() throws Exception {
        mockMvc.perform(post("/api/campaigns/{campaignId}/complete", existingCampaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.campaignStatus").value("COMPLETED"));

        mockMvc.perform(post("/api/campaigns/{campaignId}/archive", existingCampaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.campaignStatus").value("ARCHIVED"));

        mockMvc.perform(post("/api/campaigns/{campaignId}/reset-demo", existingCampaign.getId())
                        .header("X-Dev-User", "gm@war.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.campaignName").value("Alpha Front Reset"))
                .andExpect(jsonPath("$.campaignStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.currentPhase").value("LOBBY"));

        Campaign archivedCampaign = campaignRepository.findById(existingCampaign.getId()).orElseThrow();
        Campaign freshCampaign = campaignRepository.findAll().stream()
                .filter(campaign -> !"Alpha Front".equals(campaign.getName()))
                .findFirst()
                .orElseThrow();
        CampaignMember freshGmMembership = campaignMemberRepository.findByCampaignAndUser(freshCampaign, gmUser).orElseThrow();

        assertThat(archivedCampaign.getCampaignStatus()).isEqualTo(CampaignStatus.ARCHIVED);
        assertThat(freshCampaign.getName()).isEqualTo("Alpha Front Reset");
        assertThat(freshGmMembership.getRole()).isEqualTo(CampaignRole.GM);
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
        campaign.setCreatedBy(createdBy);
        campaign.setCurrentPhase(CampaignPhase.LOBBY);
        campaign.setCurrentTurnNumber(1);
        campaign.setCampaignStatus(CampaignStatus.ACTIVE);
        return campaignRepository.save(campaign);
    }

    private CampaignMember saveMembership(Campaign campaign, User user, CampaignRole role) {
        CampaignMember membership = new CampaignMember();
        membership.setCampaign(campaign);
        membership.setUser(user);
        membership.setRole(role);
        return campaignMemberRepository.save(membership);
    }
}
