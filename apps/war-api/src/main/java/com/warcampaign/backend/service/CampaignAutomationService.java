package com.warcampaign.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warcampaign.backend.config.JobsProperties;
import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;
import com.warcampaign.backend.domain.model.OrderSubmission;
import com.warcampaign.backend.repository.OrderSubmissionRepository;
import com.warcampaign.backend.domain.enums.InviteStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignInvite;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignInviteRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.UserRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CampaignAutomationService {

    private static final List<CampaignStatus> SNAPSHOT_CAMPAIGN_STATUSES = List.of(CampaignStatus.ACTIVE, CampaignStatus.PAUSED);
    private static final List<CampaignStatus> VISIBILITY_CAMPAIGN_STATUSES = List.of(CampaignStatus.ACTIVE, CampaignStatus.PAUSED, CampaignStatus.COMPLETED);

    private final CampaignPhaseService campaignPhaseService;
    private final CampaignVisibilityService campaignVisibilityService;
    private final CampaignAdminService campaignAdminService;
    private final CampaignRepository campaignRepository;
    private final CampaignInviteRepository campaignInviteRepository;
    private final CampaignMemberRepository campaignMemberRepository;
    private final UserRepository userRepository;
    private final OrderSubmissionRepository orderSubmissionRepository;
    private final NotificationService notificationService;
    private final JobsProperties jobsProperties;
    private final ObjectMapper objectMapper;

    public CampaignAutomationService(CampaignPhaseService campaignPhaseService,
                                     CampaignVisibilityService campaignVisibilityService,
                                     CampaignAdminService campaignAdminService,
                                     CampaignRepository campaignRepository,
                                     CampaignInviteRepository campaignInviteRepository,
                                     CampaignMemberRepository campaignMemberRepository,
                                     UserRepository userRepository,
                                     OrderSubmissionRepository orderSubmissionRepository,
                                     NotificationService notificationService,
                                     JobsProperties jobsProperties,
                                     ObjectMapper objectMapper) {
        this.campaignPhaseService = campaignPhaseService;
        this.campaignVisibilityService = campaignVisibilityService;
        this.campaignAdminService = campaignAdminService;
        this.campaignRepository = campaignRepository;
        this.campaignInviteRepository = campaignInviteRepository;
        this.campaignMemberRepository = campaignMemberRepository;
        this.userRepository = userRepository;
        this.orderSubmissionRepository = orderSubmissionRepository;
        this.notificationService = notificationService;
        this.jobsProperties = jobsProperties;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public int advanceExpiredCampaigns() {
        return campaignPhaseService.advanceExpiredCampaigns();
    }

    /**
     * Checks all ACTIVE campaigns with aiGm=true. If all human players have locked their
     * OPERATIONS orders, the campaign phase is automatically advanced.
     */
    @Transactional
    public int checkAiGmCampaigns() {
        List<Campaign> activeCampaigns = campaignRepository.findAllByCampaignStatusIn(
                List.of(CampaignStatus.ACTIVE));
        int advancedCount = 0;

        for (Campaign campaign : activeCampaigns) {
            if (!isAiGmEnabled(campaign)) continue;

            try {
                if (campaign.getCurrentPhase() == CampaignPhase.STRATEGIC) {
                    // Strategic has no player gate — advance to Operations immediately
                    campaignPhaseService.advancePhaseAsSystem(campaign.getId());
                    advancedCount++;
                } else if (campaign.getCurrentPhase() == CampaignPhase.OPERATIONS) {
                    if (allHumanPlayersLocked(campaign)) {
                        campaignPhaseService.advancePhaseAsSystem(campaign.getId());
                        advancedCount++;
                    }
                }
            } catch (Exception e) {
                // Log and continue — don't let one campaign failure block others
            }
        }
        return advancedCount;
    }

    private boolean isAiGmEnabled(Campaign campaign) {
        if (campaign.getMetadataJson() == null) return false;
        try {
            com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(campaign.getMetadataJson());
            return root.path("aiGm").asBoolean(false);
        } catch (JsonProcessingException e) {
            return false;
        }
    }

    private boolean allHumanPlayersLocked(Campaign campaign) {
        List<CampaignMember> allMembers = campaignMemberRepository.findAllByCampaignIdWithUser(campaign.getId());
        // In single-player (aiGm) campaigns the GM is also the human player — include GM in the check
        boolean spMode = isAiGmEnabled(campaign);
        List<CampaignMember> humanPlayers = allMembers.stream()
                .filter(m -> !m.isCpuControlled()
                        && (m.getRole() == CampaignRole.PLAYER || (spMode && m.getRole() == CampaignRole.GM)))
                .toList();

        if (humanPlayers.isEmpty()) return false;

        List<OrderSubmission> submissions = orderSubmissionRepository
                .findAllByCampaignIdAndTurnNumberOrderBySubmittedAtAsc(
                        campaign.getId(), campaign.getCurrentTurnNumber());

        Set<java.util.UUID> lockedMemberIds = submissions.stream()
                .filter(s -> s.getStatus() == OrderSubmissionStatus.LOCKED)
                .map(s -> s.getSubmittedByMember().getId())
                .collect(Collectors.toSet());

        return humanPlayers.stream().allMatch(m -> lockedMemberIds.contains(m.getId()));
    }

    @Transactional
    public int sendPhaseEndingSoonReminders() {
        Instant now = Instant.now();
        Instant threshold = now.plus(jobsProperties.getPhaseReminderWindow());
        int notificationCount = 0;

        for (Campaign campaign : campaignRepository.findAllWithPhaseEndingBetween(now, threshold)) {
            String payloadJson = toPayload(Map.of(
                    "campaignId", campaign.getId().toString(),
                    "turnNumber", campaign.getCurrentTurnNumber(),
                    "currentPhase", campaign.getCurrentPhase().name(),
                    "phaseEndsAt", campaign.getPhaseEndsAt().toString()
            ));
            for (CampaignMember member : campaignMemberRepository.findAllByCampaignIdWithUser(campaign.getId())) {
                if (notificationService.notifyUserIfAbsent(
                        campaign,
                        member.getUser(),
                        "PHASE_ENDING_SOON",
                        "Campaign phase ending soon",
                        campaign.getName() + " is ending " + campaign.getCurrentPhase() + " soon.",
                        payloadJson
                )) {
                    notificationCount++;
                }
            }
        }

        return notificationCount;
    }

    @Transactional
    public int sendInviteExpiryReminders() {
        Instant now = Instant.now();
        Instant threshold = now.plus(jobsProperties.getInviteReminderWindow());
        int notificationCount = 0;

        for (CampaignInvite invite : campaignInviteRepository.findAllByStatusAndExpiresAtBetween(InviteStatus.PENDING, now, threshold)) {
            if (invite.isOpenInvite() || invite.getInviteeEmail() == null) {
                continue;
            }
            User recipient = userRepository.findByEmailIgnoreCase(invite.getInviteeEmail()).orElse(null);
            if (recipient == null) {
                continue;
            }

            String payloadJson = toPayload(Map.of(
                    "campaignId", invite.getCampaign().getId().toString(),
                    "inviteId", invite.getId().toString(),
                    "expiresAt", invite.getExpiresAt().toString()
            ));
            if (notificationService.notifyUserIfAbsent(
                    invite.getCampaign(),
                    recipient,
                    "INVITE_EXPIRING_SOON",
                    "Campaign invite expiring soon",
                    "Your invite to " + invite.getCampaign().getName() + " expires soon.",
                    payloadJson
            )) {
                notificationCount++;
            }
        }

        return notificationCount;
    }

    @Transactional
    public int expirePendingInvites() {
        int expiredCount = 0;
        for (CampaignInvite invite : campaignInviteRepository.findAllByStatusAndExpiresAtBefore(InviteStatus.PENDING, Instant.now())) {
            invite.setStatus(InviteStatus.EXPIRED);
            campaignInviteRepository.save(invite);
            expiredCount++;
        }
        return expiredCount;
    }

    public int rebuildVisibilityForActiveCampaigns() {
        int rebuiltCount = 0;
        for (Campaign campaign : campaignRepository.findAllByFogOfWarEnabledTrueAndCampaignStatusIn(VISIBILITY_CAMPAIGN_STATUSES)) {
            try {
                campaignVisibilityService.rebuildVisibility(campaign);
                rebuiltCount++;
            } catch (Exception e) {
                // Log and continue — don't let one campaign failure block others
            }
        }
        return rebuiltCount;
    }

    @Transactional(readOnly = true)
    public int exportActiveCampaignSnapshots() {
        List<Campaign> campaigns = campaignRepository.findAllByCampaignStatusIn(SNAPSHOT_CAMPAIGN_STATUSES);
        Path snapshotDirectory = Path.of(jobsProperties.getSnapshotDirectory());
        createDirectories(snapshotDirectory);

        int exportCount = 0;
        for (Campaign campaign : campaigns) {
            CampaignMember gmMembership = campaignMemberRepository.findFirstByCampaignIdAndRole(campaign.getId(), CampaignRole.GM)
                    .orElse(null);
            if (gmMembership == null) {
                continue;
            }

            AuthenticatedUser systemUser = new AuthenticatedUser(
                    gmMembership.getUser().getId(),
                    gmMembership.getUser().getEmail(),
                    gmMembership.getUser().getDisplayName()
            );
            String snapshotJson = toJson(campaignAdminService.exportSnapshot(campaign.getId(), systemUser));
            Path snapshotPath = snapshotDirectory.resolve(campaign.getId() + ".json");
            writeSnapshot(snapshotPath, snapshotJson);
            exportCount++;
        }
        return exportCount;
    }

    private String toPayload(Map<String, Object> payload) {
        return toJson(new LinkedHashMap<>(payload));
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new ApiException("JOB_SERIALIZATION_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize job payload");
        }
    }

    private void createDirectories(Path directory) {
        try {
            Files.createDirectories(directory);
        } catch (IOException exception) {
            throw new ApiException("SNAPSHOT_EXPORT_FAILED", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to prepare snapshot directory");
        }
    }

    private void writeSnapshot(Path snapshotPath, String snapshotJson) {
        try {
            Files.writeString(
                    snapshotPath,
                    snapshotJson,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE
            );
        } catch (IOException exception) {
            throw new ApiException("SNAPSHOT_EXPORT_FAILED", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to export campaign snapshot");
        }
    }
}
