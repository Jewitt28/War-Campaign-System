package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.InviteStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignInvite;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.repository.CampaignInviteRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class InviteAcceptanceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CampaignRepository campaignRepository;

    @Autowired
    private CampaignInviteRepository inviteRepository;

    @Autowired
    private CampaignMemberRepository memberRepository;

    private Campaign campaign;

    @BeforeEach
    void setup() {
        memberRepository.deleteAll();
        inviteRepository.deleteAll();
        campaignRepository.deleteAll();
        userRepository.deleteAll();

        User gm = new User();
        gm.setEmail("gm@war.local");
        gm.setDisplayName("gm");
        gm.setActive(true);
        gm = userRepository.save(gm);

        campaign = new Campaign();
        campaign.setName("Invite Test Campaign");
        campaign.setCurrentPhase(CampaignPhase.LOBBY);
        campaign.setCreatedBy(gm);
        campaign = campaignRepository.save(campaign);
    }

    @Test
    void acceptsValidInviteAndCreatesMembership() throws Exception {
        createInvite("valid-token", "player1@war.local", InviteStatus.PENDING, Instant.now().plusSeconds(3600));

        mockMvc.perform(post("/api/invites/valid-token/accept")
                        .header("X-Dev-User", "player1@war.local")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.role").value("PLAYER"));

        CampaignInvite invite = inviteRepository.findByInviteToken("valid-token").orElseThrow();
        assertThat(invite.getStatus()).isEqualTo(InviteStatus.ACCEPTED);

        User player = userRepository.findByEmailIgnoreCase("player1@war.local").orElseThrow();
        CampaignMember member = memberRepository.findByCampaignAndUser(campaign, player).orElseThrow();
        assertThat(member.getRole()).isEqualTo(CampaignRole.PLAYER);
    }

    @Test
    void rejectsExpiredInvite() throws Exception {
        createInvite("expired-token", "player2@war.local", InviteStatus.PENDING, Instant.now().minusSeconds(5));

        mockMvc.perform(post("/api/invites/expired-token/accept")
                        .header("X-Dev-User", "player2@war.local"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVITE_EXPIRED"));
    }

    @Test
    void rejectsRevokedInvite() throws Exception {
        createInvite("revoked-token", "player3@war.local", InviteStatus.REVOKED, Instant.now().plusSeconds(3600));

        mockMvc.perform(post("/api/invites/revoked-token/accept")
                        .header("X-Dev-User", "player3@war.local"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVITE_REVOKED"));
    }

    @Test
    void preventsDuplicateAcceptance() throws Exception {
        createInvite("duplicate-token", "player4@war.local", InviteStatus.PENDING, Instant.now().plusSeconds(3600));

        mockMvc.perform(post("/api/invites/duplicate-token/accept")
                        .header("X-Dev-User", "player4@war.local"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/invites/duplicate-token/accept")
                        .header("X-Dev-User", "player4@war.local"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVITE_ALREADY_ACCEPTED"));
    }

    private void createInvite(String token, String email, InviteStatus status, Instant expiresAt) {
        User gm = campaign.getCreatedBy();
        CampaignInvite invite = new CampaignInvite();
        invite.setCampaign(campaign);
        invite.setInvitedBy(gm);
        invite.setInviteeEmail(email);
        invite.setInviteToken(token);
        invite.setIntendedRole(CampaignRole.PLAYER);
        invite.setStatus(status);
        invite.setExpiresAt(expiresAt);
        inviteRepository.save(invite);
    }
}
