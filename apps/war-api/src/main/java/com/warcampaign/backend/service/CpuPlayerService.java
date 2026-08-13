package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;
import com.warcampaign.backend.domain.enums.PlatoonOrderType;
import com.warcampaign.backend.domain.enums.PlatoonOrderValidationStatus;
import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.domain.model.OrderSubmission;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonOrder;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.TerritoryState;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.CampaignRepository;
import com.warcampaign.backend.repository.OrderSubmissionRepository;
import com.warcampaign.backend.repository.PlatoonOrderRepository;
import com.warcampaign.backend.repository.PlatoonRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Generates orders for CPU-controlled campaign members during the OPERATIONS phase.
 * Called automatically when a campaign transitions to OPERATIONS.
 */
@Service
public class CpuPlayerService {

    private static final Logger log = LoggerFactory.getLogger(CpuPlayerService.class);

    private final CampaignRepository campaignRepository;
    private final CampaignMemberRepository campaignMemberRepository;
    private final PlatoonRepository platoonRepository;
    private final PlatoonStateRepository platoonStateRepository;
    private final TerritoryStateRepository territoryStateRepository;
    private final OrderSubmissionRepository orderSubmissionRepository;
    private final PlatoonOrderRepository platoonOrderRepository;

    public CpuPlayerService(CampaignRepository campaignRepository,
                            CampaignMemberRepository campaignMemberRepository,
                            PlatoonRepository platoonRepository,
                            PlatoonStateRepository platoonStateRepository,
                            TerritoryStateRepository territoryStateRepository,
                            OrderSubmissionRepository orderSubmissionRepository,
                            PlatoonOrderRepository platoonOrderRepository) {
        this.campaignRepository = campaignRepository;
        this.campaignMemberRepository = campaignMemberRepository;
        this.platoonRepository = platoonRepository;
        this.platoonStateRepository = platoonStateRepository;
        this.territoryStateRepository = territoryStateRepository;
        this.orderSubmissionRepository = orderSubmissionRepository;
        this.platoonOrderRepository = platoonOrderRepository;
    }

    /**
     * Generates and locks orders for all CPU-controlled members in the campaign.
     * Each CPU member gets one OrderSubmission with one PlatoonOrder per active platoon.
     */
    @Transactional
    public void generateOrdersForAllCpuMembers(UUID campaignId, int turnNumber) {
        Campaign campaign = campaignRepository.findById(campaignId).orElse(null);
        if (campaign == null) return;

        List<CampaignMember> cpuMembers = campaignMemberRepository.findAllCpuMembersByCampaignId(campaignId);
        if (cpuMembers.isEmpty()) return;

        List<PlatoonState> allPlatoonStates = platoonStateRepository.findAllByCampaignIdAndTurnNumber(campaignId, turnNumber);
        List<TerritoryState> allTerritoryStates = territoryStateRepository.findAllByCampaignIdAndTurnNumber(campaignId, turnNumber);

        Map<UUID, TerritoryState> stateByTerritoryId = allTerritoryStates.stream()
                .collect(Collectors.toMap(ts -> ts.getTerritory().getId(), ts -> ts, (a, b) -> a));

        for (CampaignMember cpuMember : cpuMembers) {
            try {
                generateOrdersForCpuMember(campaign, cpuMember, turnNumber, allPlatoonStates, stateByTerritoryId);
            } catch (Exception e) {
                log.error("Failed to generate CPU orders for member {} in campaign {}: {}",
                        cpuMember.getId(), campaignId, e.getMessage());
            }
        }
    }

    private void generateOrdersForCpuMember(Campaign campaign,
                                             CampaignMember cpuMember,
                                             int turnNumber,
                                             List<PlatoonState> allPlatoonStates,
                                             Map<UUID, TerritoryState> stateByTerritoryId) {
        // Skip if already has a submission this turn
        if (orderSubmissionRepository.findByCampaignIdAndTurnNumberAndSubmittedByMemberId(
                campaign.getId(), turnNumber, cpuMember.getId()).isPresent()) {
            return;
        }

        Nation nation = cpuMember.getNation();
        if (nation == null) return;

        // Filter platoon states to this CPU member's nation
        List<PlatoonState> nationPlatoonStates = allPlatoonStates.stream()
                .filter(ps -> nation.equals(ps.getPlatoon().getNation()))
                .filter(ps -> ps.getReadinessStatus() != PlatoonReadinessStatus.DESTROYED)
                .toList();

        if (nationPlatoonStates.isEmpty()) return;

        // Determine faction for order submission: member faction > nation faction > first platoon faction
        Faction submissionFaction = cpuMember.getFaction();
        if (submissionFaction == null) submissionFaction = nation.getFaction();
        if (submissionFaction == null) submissionFaction = nationPlatoonStates.get(0).getPlatoon().getFaction();
        if (submissionFaction == null) {
            log.warn("CPU member {} has no faction — cannot create order submission", cpuMember.getId());
            return;
        }

        OrderSubmission submission = new OrderSubmission();
        submission.setCampaign(campaign);
        submission.setTurnNumber(turnNumber);
        submission.setSubmittedByMember(cpuMember);
        submission.setFaction(submissionFaction);
        submission.setStatus(OrderSubmissionStatus.LOCKED);
        submission.setLockedAt(Instant.now());
        submission.setChecksum("cpu-generated");
        OrderSubmission saved = orderSubmissionRepository.save(submission);

        String strategy = cpuMember.getCpuStrategy();

        for (PlatoonState platoonState : nationPlatoonStates) {
            PlatoonOrderType orderType = computeOrderType(platoonState, stateByTerritoryId, strategy, submissionFaction);
            PlatoonOrder order = new PlatoonOrder();
            order.setOrderSubmission(saved);
            order.setPlatoon(platoonState.getPlatoon());
            order.setOrderType(orderType);
            order.setSourceTerritory(platoonState.getTerritory());
            order.setValidationStatus(PlatoonOrderValidationStatus.VALID);
            platoonOrderRepository.save(order);
        }

        log.info("CPU orders generated for member {} (nation: {}, strategy: {}, platoons: {})",
                cpuMember.getId(), nation.getName(), strategy, nationPlatoonStates.size());
    }

    private PlatoonOrderType computeOrderType(PlatoonState platoonState,
                                              Map<UUID, TerritoryState> stateByTerritoryId,
                                              String strategy,
                                              Faction ownFaction) {
        // Damaged or reserve units always refit
        if (platoonState.getReadinessStatus() == PlatoonReadinessStatus.DAMAGED ||
                platoonState.getReadinessStatus() == PlatoonReadinessStatus.RESERVES) {
            return PlatoonOrderType.REFIT;
        }

        Territory currentTerritory = platoonState.getTerritory();
        if (currentTerritory == null) return PlatoonOrderType.HOLD;

        TerritoryState ts = stateByTerritoryId.get(currentTerritory.getId());
        if (ts == null) return PlatoonOrderType.HOLD;

        TerritoryStrategicStatus status = ts.getStrategicStatus();

        return switch (strategy) {
            case "AGGRESSIVE" -> {
                if (status == TerritoryStrategicStatus.CONTESTED) yield PlatoonOrderType.ATTACK;
                yield PlatoonOrderType.HOLD;
            }
            case "DEFENSIVE" -> {
                if (status == TerritoryStrategicStatus.CONTESTED) yield PlatoonOrderType.WITHDRAW;
                yield PlatoonOrderType.HOLD;
            }
            default -> { // BALANCED
                if (status == TerritoryStrategicStatus.CONTESTED) {
                    boolean ownTerritory = ownFaction.equals(ts.getControllingFaction());
                    yield ownTerritory ? PlatoonOrderType.HOLD : PlatoonOrderType.ATTACK;
                }
                yield PlatoonOrderType.HOLD;
            }
        };
    }
}
