package com.warcampaign.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warcampaign.backend.domain.enums.AuditActorType;
import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignAuditLog;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.OrderSubmission;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.dto.CampaignPhaseResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignAuditLogRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.OrderSubmissionRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CampaignPhaseService {

    private static final Map<CampaignPhase, CampaignPhase> NEXT_PHASES = new EnumMap<>(CampaignPhase.class);

    static {
        NEXT_PHASES.put(CampaignPhase.LOBBY, CampaignPhase.STRATEGIC);
        NEXT_PHASES.put(CampaignPhase.STRATEGIC, CampaignPhase.OPERATIONS);
        NEXT_PHASES.put(CampaignPhase.OPERATIONS, CampaignPhase.RESOLUTION);
        NEXT_PHASES.put(CampaignPhase.RESOLUTION, CampaignPhase.INTERTURN);
        NEXT_PHASES.put(CampaignPhase.INTERTURN, CampaignPhase.STRATEGIC);
    }

    private final CampaignMemberRepository campaignMemberRepository;
    private final CampaignRepository campaignRepository;
    private final TurnRepository turnRepository;
    private final OrderSubmissionRepository orderSubmissionRepository;
    private final CampaignAuditLogRepository campaignAuditLogRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public CampaignPhaseService(CampaignMemberRepository campaignMemberRepository,
                                CampaignRepository campaignRepository,
                                TurnRepository turnRepository,
                                OrderSubmissionRepository orderSubmissionRepository,
                                CampaignAuditLogRepository campaignAuditLogRepository,
                                NotificationService notificationService,
                                ObjectMapper objectMapper) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.campaignRepository = campaignRepository;
        this.turnRepository = turnRepository;
        this.orderSubmissionRepository = orderSubmissionRepository;
        this.campaignAuditLogRepository = campaignAuditLogRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CampaignPhaseResponse advancePhase(UUID campaignId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireGmMembership(campaignId, authenticatedUser.id());
        Campaign campaign = membership.getCampaign();
        CampaignPhase previousPhase = campaign.getCurrentPhase();
        CampaignPhase nextPhase = NEXT_PHASES.get(previousPhase);
        if (nextPhase == null) {
            throw new ApiException("PHASE_TRANSITION_INVALID", HttpStatus.CONFLICT, "Campaign phase cannot be advanced");
        }

        TransitionSnapshot beforeSnapshot = snapshot(campaign);
        applyPhaseTransition(campaign, previousPhase, nextPhase);
        Campaign savedCampaign = campaignRepository.save(campaign);
        writeAuditLog(savedCampaign, membership, beforeSnapshot, snapshot(savedCampaign));
        notifyPhaseTransition(savedCampaign, previousPhase, nextPhase);

        return toResponse(savedCampaign);
    }

    @Transactional
    public int advanceExpiredCampaigns() {
        List<Campaign> campaigns = campaignRepository.findAllWithExpiredPhase(Instant.now());
        int advancedCount = 0;
        for (Campaign campaign : campaigns) {
            CampaignPhase nextPhase = NEXT_PHASES.get(campaign.getCurrentPhase());
            if (nextPhase == null) {
                continue;
            }
            TransitionSnapshot beforeSnapshot = snapshot(campaign);
            CampaignPhase previousPhase = campaign.getCurrentPhase();
            applyPhaseTransition(campaign, previousPhase, nextPhase);
            Campaign savedCampaign = campaignRepository.save(campaign);
            writeSystemAuditLog(savedCampaign, beforeSnapshot, snapshot(savedCampaign));
            notifyPhaseTransition(savedCampaign, previousPhase, nextPhase);
            advancedCount++;
        }
        return advancedCount;
    }

    private CampaignMember requireGmMembership(UUID campaignId, UUID userId) {
        CampaignMember membership = campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
        if (membership.getRole() != CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required for phase management");
        }
        return membership;
    }

    private void applyPhaseTransition(Campaign campaign, CampaignPhase previousPhase, CampaignPhase nextPhase) {
        Instant now = Instant.now();
        Turn currentTurn = ensureTurn(campaign, campaign.getCurrentTurnNumber(), previousPhase, now);

        if (previousPhase == CampaignPhase.OPERATIONS) {
            autoLockValidatedSubmissions(campaign);
        }

        currentTurn.setPhase(nextPhase);
        if (nextPhase == CampaignPhase.STRATEGIC && previousPhase == CampaignPhase.INTERTURN) {
            currentTurn.setEndsAt(now);
            turnRepository.save(currentTurn);
            int nextTurnNumber = campaign.getCurrentTurnNumber() + 1;
            Turn nextTurn = new Turn();
            nextTurn.setCampaign(campaign);
            nextTurn.setTurnNumber(nextTurnNumber);
            nextTurn.setPhase(CampaignPhase.STRATEGIC);
            nextTurn.setStartsAt(now);
            turnRepository.save(nextTurn);
            campaign.setCurrentTurnNumber(nextTurnNumber);
        } else {
            turnRepository.save(currentTurn);
        }

        campaign.setCurrentPhase(nextPhase);
        campaign.setPhaseStartedAt(now);
        campaign.setPhaseEndsAt(null);
    }

    private Turn ensureTurn(Campaign campaign, int turnNumber, CampaignPhase phase, Instant now) {
        return turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), turnNumber)
                .orElseGet(() -> {
                    Turn turn = new Turn();
                    turn.setCampaign(campaign);
                    turn.setTurnNumber(turnNumber);
                    turn.setPhase(phase);
                    turn.setStartsAt(now);
                    return turnRepository.save(turn);
                });
    }

    private void autoLockValidatedSubmissions(Campaign campaign) {
        List<CampaignMember> members = campaignMemberRepository.findAllByCampaignIdWithUser(campaign.getId());
        Instant lockedAt = Instant.now();
        for (CampaignMember member : members) {
            if (member.getRole() != CampaignRole.PLAYER) {
                continue;
            }
            orderSubmissionRepository.findByCampaignIdAndTurnNumberAndSubmittedByMemberId(campaign.getId(), campaign.getCurrentTurnNumber(), member.getId())
                    .filter(submission -> submission.getStatus() == OrderSubmissionStatus.VALIDATED)
                    .ifPresent(submission -> {
                        submission.setStatus(OrderSubmissionStatus.LOCKED);
                        submission.setLockedAt(lockedAt);
                        if (submission.getChecksum() == null) {
                            submission.setChecksum("auto-locked");
                        }
                        orderSubmissionRepository.save(submission);
                        notificationService.notifyUser(
                                campaign,
                                member.getUser(),
                                "ORDERS_AUTO_LOCKED",
                                "Orders auto-locked",
                                "Your turn " + campaign.getCurrentTurnNumber() + " orders in " + campaign.getName() + " were auto-locked.",
                                "{\"campaignId\":\"" + campaign.getId() + "\",\"turnNumber\":" + campaign.getCurrentTurnNumber() + "}"
                        );
                    });
        }
    }

    private void notifyPhaseTransition(Campaign campaign, CampaignPhase previousPhase, CampaignPhase nextPhase) {
        notificationService.notifyCampaignMembers(
                campaign,
                "PHASE_STARTED",
                "Campaign phase started",
                campaign.getName() + " advanced from " + previousPhase + " to " + nextPhase + ".",
                "{\"campaignId\":\"" + campaign.getId() + "\",\"currentTurnNumber\":" + campaign.getCurrentTurnNumber() + ",\"currentPhase\":\"" + nextPhase + "\"}"
        );
    }

    private void writeAuditLog(Campaign campaign,
                               CampaignMember actorMember,
                               TransitionSnapshot beforeSnapshot,
                               TransitionSnapshot afterSnapshot) {
        CampaignAuditLog auditLog = new CampaignAuditLog();
        auditLog.setCampaign(campaign);
        auditLog.setActorType(AuditActorType.USER);
        auditLog.setActorUser(actorMember.getUser());
        auditLog.setActorMember(actorMember);
        auditLog.setActionType("CAMPAIGN_PHASE_ADVANCED");
        auditLog.setEntityType("CAMPAIGN");
        auditLog.setEntityId(campaign.getId());
        auditLog.setBeforeJson(toJson(beforeSnapshot));
        auditLog.setAfterJson(toJson(afterSnapshot));
        campaignAuditLogRepository.save(auditLog);
    }

    private void writeSystemAuditLog(Campaign campaign,
                                     TransitionSnapshot beforeSnapshot,
                                     TransitionSnapshot afterSnapshot) {
        CampaignAuditLog auditLog = new CampaignAuditLog();
        auditLog.setCampaign(campaign);
        auditLog.setActorType(AuditActorType.SYSTEM);
        auditLog.setActionType("CAMPAIGN_PHASE_AUTO_ADVANCED");
        auditLog.setEntityType("CAMPAIGN");
        auditLog.setEntityId(campaign.getId());
        auditLog.setBeforeJson(toJson(beforeSnapshot));
        auditLog.setAfterJson(toJson(afterSnapshot));
        campaignAuditLogRepository.save(auditLog);
    }

    private TransitionSnapshot snapshot(Campaign campaign) {
        return new TransitionSnapshot(
                campaign.getCurrentTurnNumber(),
                campaign.getCurrentPhase(),
                campaign.getPhaseStartedAt(),
                campaign.getPhaseEndsAt()
        );
    }

    private String toJson(TransitionSnapshot snapshot) {
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException exception) {
            throw new ApiException("AUDIT_SERIALIZATION_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize audit transition");
        }
    }

    private CampaignPhaseResponse toResponse(Campaign campaign) {
        return new CampaignPhaseResponse(
                campaign.getId(),
                campaign.getCurrentTurnNumber(),
                campaign.getCurrentPhase(),
                campaign.getPhaseStartedAt(),
                campaign.getPhaseEndsAt()
        );
    }

    private record TransitionSnapshot(int currentTurnNumber,
                                      CampaignPhase currentPhase,
                                      Instant phaseStartedAt,
                                      Instant phaseEndsAt) {
    }
}
