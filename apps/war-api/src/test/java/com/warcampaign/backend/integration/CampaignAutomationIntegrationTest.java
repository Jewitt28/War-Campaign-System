package com.warcampaign.backend.integration;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.FactionType;
import com.warcampaign.backend.domain.enums.InviteStatus;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignInvite;
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
import com.warcampaign.backend.service.CampaignAutomationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "app.jobs.snapshot-directory=target/test-campaign-snapshots")
class CampaignAutomationIntegrationTest {

    @Autowired
    private CampaignAutomationService campaignAutomationService;
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

    private Campaign campaign;
    private User gmUser;
    private User playerUser;
    private User invitedUser;
    private Faction allies;
    private Nation british;
    private Theatre theatre;
    private Territory normandy;

    @BeforeEach
    void setup() throws IOException {
        Path snapshotDirectory = Path.of("target/test-campaign-snapshots");
        if (Files.exists(snapshotDirectory)) {
            try (var paths = Files.walk(snapshotDirectory)) {
                paths.sorted(Comparator.reverseOrder())
                        .forEach(path -> {
                            try {
                                Files.deleteIfExists(path);
                            } catch (IOException exception) {
                                throw new RuntimeException(exception);
                            }
                        });
            }
        }

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
        invitedUser = saveUser("invitee@war.local", "invitee");

        campaign = saveCampaign("Automation Front", gmUser, CampaignPhase.OPERATIONS, Instant.now().minusSeconds(60));
        theatre = saveTheatre(campaign, "west", "Western Europe", 1);
        allies = saveFaction(campaign, "allies", "Allies");
        british = saveNation(campaign, allies, "uk", "United Kingdom");
        normandy = saveTerritory(campaign, theatre, "normandy", "Normandy");

        saveMembership(campaign, gmUser, CampaignRole.GM, null, null);
        saveMembership(campaign, playerUser, CampaignRole.PLAYER, allies, british);

        Turn turn = saveTurn(campaign, 1, CampaignPhase.OPERATIONS);
        saveTerritoryState(turn, normandy, allies, british, TerritoryStrategicStatus.CONTROLLED);
        Platoon platoon = savePlatoon(campaign, allies, british, normandy, "allies-1", "Allied 1st Platoon");
        savePlatoonState(turn, platoon, normandy, PlatoonReadinessStatus.ACTIVE, 8);
    }

    @Test
    void expiredPhaseAdvanceAndSnapshotExportAreIdempotent() {
        int advancedCount = campaignAutomationService.advanceExpiredCampaigns();
        assertThat(advancedCount).isEqualTo(1);

        Campaign savedCampaign = campaignRepository.findById(campaign.getId()).orElseThrow();
        assertThat(savedCampaign.getCurrentPhase()).isEqualTo(CampaignPhase.RESOLUTION);

        int exportedCount = campaignAutomationService.exportActiveCampaignSnapshots();
        assertThat(exportedCount).isEqualTo(1);
        assertThat(Path.of("target/test-campaign-snapshots", campaign.getId() + ".json")).exists();

        int secondExportCount = campaignAutomationService.exportActiveCampaignSnapshots();
        assertThat(secondExportCount).isEqualTo(1);
    }

    @Test
    void phaseAndInviteRemindersDoNotDuplicate() {
        campaign.setCurrentPhase(CampaignPhase.STRATEGIC);
        campaign.setPhaseEndsAt(Instant.now().plusSeconds(600));
        campaignRepository.save(campaign);

        CampaignInvite invite = new CampaignInvite();
        invite.setCampaign(campaign);
        invite.setInvitedBy(gmUser);
        invite.setInviteeEmail(invitedUser.getEmail());
        invite.setInviteToken("invite-reminder-token");
        invite.setIntendedRole(CampaignRole.PLAYER);
        invite.setStatus(InviteStatus.PENDING);
        invite.setExpiresAt(Instant.now().plusSeconds(3600));
        campaignInviteRepository.save(invite);

        int phaseReminderCount = campaignAutomationService.sendPhaseEndingSoonReminders();
        int inviteReminderCount = campaignAutomationService.sendInviteExpiryReminders();

        assertThat(phaseReminderCount).isEqualTo(2);
        assertThat(inviteReminderCount).isEqualTo(1);

        assertThat(campaignAutomationService.sendPhaseEndingSoonReminders()).isZero();
        assertThat(campaignAutomationService.sendInviteExpiryReminders()).isZero();

        assertThat(notificationRepository.findAll()).hasSize(3);
    }

    @Test
    void pendingInvitesExpireAndVisibilityCanBeRebuiltForActiveCampaigns() {
        CampaignInvite invite = new CampaignInvite();
        invite.setCampaign(campaign);
        invite.setInvitedBy(gmUser);
        invite.setInviteeEmail("late@war.local");
        invite.setInviteToken("expired-token");
        invite.setIntendedRole(CampaignRole.PLAYER);
        invite.setStatus(InviteStatus.PENDING);
        invite.setExpiresAt(Instant.now().minusSeconds(30));
        campaignInviteRepository.save(invite);

        int expiredCount = campaignAutomationService.expirePendingInvites();
        int rebuiltCount = campaignAutomationService.rebuildVisibilityForActiveCampaigns();

        assertThat(expiredCount).isEqualTo(1);
        assertThat(campaignInviteRepository.findByInviteToken("expired-token")).get().extracting(CampaignInvite::getStatus)
                .isEqualTo(InviteStatus.EXPIRED);
        assertThat(rebuiltCount).isEqualTo(1);
        assertThat(visibilityStateRepository.findAll()).hasSize(1);
    }

    private User saveUser(String email, String displayName) {
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setActive(true);
        return userRepository.save(user);
    }

    private Campaign saveCampaign(String name, User createdBy, CampaignPhase phase, Instant phaseEndsAt) {
        Campaign savedCampaign = new Campaign();
        savedCampaign.setName(name);
        savedCampaign.setCurrentPhase(phase);
        savedCampaign.setCurrentTurnNumber(1);
        savedCampaign.setCampaignStatus(CampaignStatus.ACTIVE);
        savedCampaign.setRulesetVersion("alpha-1");
        savedCampaign.setTimersEnabled(true);
        savedCampaign.setFogOfWarEnabled(true);
        savedCampaign.setPhaseStartedAt(Instant.now().minusSeconds(600));
        savedCampaign.setPhaseEndsAt(phaseEndsAt);
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

    private Theatre saveTheatre(Campaign campaign, String key, String name, int displayOrder) {
        Theatre savedTheatre = new Theatre();
        savedTheatre.setCampaign(campaign);
        savedTheatre.setTheatreKey(key);
        savedTheatre.setName(name);
        savedTheatre.setDisplayOrder(displayOrder);
        savedTheatre.setActive(true);
        return theatreRepository.save(savedTheatre);
    }

    private Faction saveFaction(Campaign campaign, String key, String name) {
        Faction faction = new Faction();
        faction.setCampaign(campaign);
        faction.setFactionKey(key);
        faction.setName(name);
        faction.setType(FactionType.MAJOR);
        faction.setPlayerControlled(true);
        faction.setColor("#336699");
        return factionRepository.save(faction);
    }

    private Nation saveNation(Campaign campaign, Faction faction, String key, String name) {
        Nation nation = new Nation();
        nation.setCampaign(campaign);
        nation.setFaction(faction);
        nation.setNationKey(key);
        nation.setName(name);
        nation.setNpc(false);
        nation.setMetadataJson("{}");
        return nationRepository.save(nation);
    }

    private Territory saveTerritory(Campaign campaign, Theatre theatre, String key, String name) {
        Territory territory = new Territory();
        territory.setCampaign(campaign);
        territory.setTheatre(theatre);
        territory.setTerritoryKey(key);
        territory.setName(name);
        territory.setTerrainType("PLAINS");
        territory.setStrategicTagsJson("[]");
        territory.setMetadataJson("{}");
        territory.setBaseIndustry(1);
        territory.setBaseManpower(1);
        territory.setMaxFortLevel(3);
        return territoryRepository.save(territory);
    }

    private Turn saveTurn(Campaign campaign, int turnNumber, CampaignPhase phase) {
        Turn turn = new Turn();
        turn.setCampaign(campaign);
        turn.setTurnNumber(turnNumber);
        turn.setPhase(phase);
        turn.setStartsAt(Instant.now().minusSeconds(600));
        return turnRepository.save(turn);
    }

    private TerritoryState saveTerritoryState(Turn turn,
                                              Territory territory,
                                              Faction controllingFaction,
                                              Nation controllerNation,
                                              TerritoryStrategicStatus strategicStatus) {
        TerritoryState territoryState = new TerritoryState();
        territoryState.setTurn(turn);
        territoryState.setTerritory(territory);
        territoryState.setControllingFaction(controllingFaction);
        territoryState.setControllerNation(controllerNation);
        territoryState.setStrategicStatus(strategicStatus);
        territoryState.setFortLevel(1);
        territoryState.setSupplyStatus("SUPPLIED");
        territoryState.setDamageJson("{}");
        return territoryStateRepository.save(territoryState);
    }

    private Platoon savePlatoon(Campaign campaign,
                                Faction faction,
                                Nation nation,
                                Territory homeTerritory,
                                String key,
                                String name) {
        Platoon platoon = new Platoon();
        platoon.setCampaign(campaign);
        platoon.setFaction(faction);
        platoon.setNation(nation);
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
}
