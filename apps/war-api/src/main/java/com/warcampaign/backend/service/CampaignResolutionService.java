package com.warcampaign.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warcampaign.backend.domain.enums.BattleMode;
import com.warcampaign.backend.domain.enums.BattleParticipantSide;
import com.warcampaign.backend.domain.enums.BattleStatus;
import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;
import com.warcampaign.backend.domain.enums.PlatoonOrderType;
import com.warcampaign.backend.domain.enums.ResolutionEventCreatedByType;
import com.warcampaign.backend.domain.enums.ResolutionVisibilityScope;
import com.warcampaign.backend.domain.model.Battle;
import com.warcampaign.backend.domain.model.BattleParticipant;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.OrderSubmission;
import com.warcampaign.backend.domain.model.PlatoonOrder;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.ResolutionEvent;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.TerritoryState;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.dto.BattleParticipantResponse;
import com.warcampaign.backend.dto.BattleSummaryResponse;
import com.warcampaign.backend.dto.CampaignResolutionResponse;
import com.warcampaign.backend.dto.ResolutionEventResponse;
import com.warcampaign.backend.dto.ResolutionSubmissionSummaryResponse;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.BattleParticipantRepository;
import com.warcampaign.backend.repository.BattleRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.OrderSubmissionRepository;
import com.warcampaign.backend.repository.PlatoonOrderRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.ResolutionEventRepository;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CampaignResolutionService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final TurnRepository turnRepository;
    private final OrderSubmissionRepository orderSubmissionRepository;
    private final PlatoonOrderRepository platoonOrderRepository;
    private final TerritoryStateRepository territoryStateRepository;
    private final PlatoonStateRepository platoonStateRepository;
    private final BattleRepository battleRepository;
    private final BattleParticipantRepository battleParticipantRepository;
    private final ResolutionEventRepository resolutionEventRepository;
    private final ObjectMapper objectMapper;

    public CampaignResolutionService(CampaignMemberRepository campaignMemberRepository,
                                     TurnRepository turnRepository,
                                     OrderSubmissionRepository orderSubmissionRepository,
                                     PlatoonOrderRepository platoonOrderRepository,
                                     TerritoryStateRepository territoryStateRepository,
                                     PlatoonStateRepository platoonStateRepository,
                                     BattleRepository battleRepository,
                                     BattleParticipantRepository battleParticipantRepository,
                                     ResolutionEventRepository resolutionEventRepository,
                                     ObjectMapper objectMapper) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.turnRepository = turnRepository;
        this.orderSubmissionRepository = orderSubmissionRepository;
        this.platoonOrderRepository = platoonOrderRepository;
        this.territoryStateRepository = territoryStateRepository;
        this.platoonStateRepository = platoonStateRepository;
        this.battleRepository = battleRepository;
        this.battleParticipantRepository = battleParticipantRepository;
        this.resolutionEventRepository = resolutionEventRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public CampaignResolutionResponse getResolutionSummary(UUID campaignId, int turnNumber, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireGmMembership(campaignId, authenticatedUser.id());
        Turn turn = requireTurn(membership.getCampaign(), turnNumber);
        return buildSummary(membership.getCampaign(), turn.getTurnNumber());
    }

    @Transactional
    public CampaignResolutionResponse resolveTurn(UUID campaignId, int turnNumber, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireGmMembership(campaignId, authenticatedUser.id());
        Campaign campaign = membership.getCampaign();
        Turn turn = requireTurn(campaign, turnNumber);

        if (campaign.getCurrentTurnNumber() != turnNumber) {
            throw new ApiException("RESOLUTION_TURN_NOT_ACTIVE", HttpStatus.CONFLICT, "Resolution can only run for the current turn");
        }
        if (campaign.getCurrentPhase() != CampaignPhase.RESOLUTION) {
            throw new ApiException("RESOLUTION_PHASE_INVALID", HttpStatus.CONFLICT, "Resolution can only run during the resolution phase");
        }
        if (battleRepository.existsByCampaignIdAndTurnNumber(campaignId, turnNumber)
                || resolutionEventRepository.existsByCampaignIdAndTurnNumber(campaignId, turnNumber)) {
            throw new ApiException("TURN_RESOLUTION_ALREADY_RUN", HttpStatus.CONFLICT, "Resolution has already been generated for this turn");
        }

        Instant resolvedAt = Instant.now();
        List<OrderSubmission> submissions = orderSubmissionRepository.findAllByCampaignIdAndTurnNumberOrderBySubmittedAtAsc(campaignId, turnNumber);
        List<OrderSubmission> revealedSubmissions = revealLockedSubmissions(submissions, resolvedAt);
        Map<UUID, List<PlatoonOrder>> ordersBySubmissionId = loadOrdersBySubmissionId(revealedSubmissions);
        List<TerritoryState> territoryStates = territoryStateRepository.findAllByCampaignIdAndTurnNumber(campaignId, turnNumber);
        Map<UUID, TerritoryState> territoryStateByTerritoryId = territoryStates.stream()
                .collect(LinkedHashMap::new, (map, state) -> map.put(state.getTerritory().getId(), state), LinkedHashMap::putAll);
        List<PlatoonState> platoonStates = platoonStateRepository.findAllByCampaignIdAndTurnNumber(campaignId, turnNumber);

        writeEvent(campaign, turnNumber, membership, "TURN_RESOLUTION_STARTED", ResolutionVisibilityScope.PUBLIC,
                null, null, null, json(Map.of("revealedSubmissionCount", revealedSubmissions.size(), "resolvedAt", resolvedAt.toString())));

        List<Battle> battles = generateBattles(campaign, turnNumber, revealedSubmissions, ordersBySubmissionId, territoryStateByTerritoryId, platoonStates, membership);

        writeEvent(campaign, turnNumber, membership, "TURN_RESOLUTION_SUMMARY", ResolutionVisibilityScope.PUBLIC,
                null, null, null, json(Map.of(
                        "revealedSubmissionCount", revealedSubmissions.size(),
                        "battleCount", battles.size(),
                        "eventGeneratedAt", resolvedAt.toString()
                )));

        return buildSummary(campaign, turnNumber);
    }

    private CampaignMember requireGmMembership(UUID campaignId, UUID userId) {
        CampaignMember membership = campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
        if (membership.getRole() != CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required for resolution");
        }
        return membership;
    }

    private Turn requireTurn(Campaign campaign, int turnNumber) {
        return turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), turnNumber)
                .orElseThrow(() -> new ApiException("CAMPAIGN_TURN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign turn not found"));
    }

    private List<OrderSubmission> revealLockedSubmissions(List<OrderSubmission> submissions, Instant revealAt) {
        List<OrderSubmission> revealed = new ArrayList<>();
        for (OrderSubmission submission : submissions) {
            if (submission.getStatus() != OrderSubmissionStatus.LOCKED) {
                continue;
            }
            submission.setStatus(OrderSubmissionStatus.REVEALED);
            submission.setRevealAt(revealAt);
            revealed.add(orderSubmissionRepository.save(submission));
        }
        return revealed;
    }

    private Map<UUID, List<PlatoonOrder>> loadOrdersBySubmissionId(List<OrderSubmission> submissions) {
        if (submissions.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<PlatoonOrder>> ordersBySubmissionId = new LinkedHashMap<>();
        List<UUID> submissionIds = submissions.stream().map(OrderSubmission::getId).toList();
        for (PlatoonOrder order : platoonOrderRepository.findAllByOrderSubmissionIdInOrderByCreatedAtAsc(submissionIds)) {
            ordersBySubmissionId.computeIfAbsent(order.getOrderSubmission().getId(), ignored -> new ArrayList<>()).add(order);
        }
        return ordersBySubmissionId;
    }

    private List<Battle> generateBattles(Campaign campaign,
                                         int turnNumber,
                                         List<OrderSubmission> submissions,
                                         Map<UUID, List<PlatoonOrder>> ordersBySubmissionId,
                                         Map<UUID, TerritoryState> territoryStateByTerritoryId,
                                         List<PlatoonState> platoonStates,
                                         CampaignMember actorMember) {
        Map<UUID, Map<UUID, List<PlatoonOrder>>> attacksByTerritoryAndFaction = new LinkedHashMap<>();
        for (OrderSubmission submission : submissions) {
            List<PlatoonOrder> orders = ordersBySubmissionId.getOrDefault(submission.getId(), List.of());
            for (PlatoonOrder order : orders) {
                if (order.getOrderType() != PlatoonOrderType.ATTACK || order.getTargetTerritory() == null) {
                    continue;
                }
                attacksByTerritoryAndFaction
                        .computeIfAbsent(order.getTargetTerritory().getId(), ignored -> new LinkedHashMap<>())
                        .computeIfAbsent(submission.getFaction().getId(), ignored -> new ArrayList<>())
                        .add(order);
            }
        }

        List<Battle> battles = new ArrayList<>();
        for (Map.Entry<UUID, Map<UUID, List<PlatoonOrder>>> territoryEntry : attacksByTerritoryAndFaction.entrySet()) {
            TerritoryState territoryState = territoryStateByTerritoryId.get(territoryEntry.getKey());
            Territory territory = territoryState != null ? territoryState.getTerritory() : territoryEntry.getValue().values().stream()
                    .flatMap(Collection::stream)
                    .map(PlatoonOrder::getTargetTerritory)
                    .findFirst()
                    .orElse(null);
            if (territory == null) {
                continue;
            }

            BattleDraft draft = determineBattleDraft(territoryEntry.getValue(), territoryState);
            if (draft == null) {
                continue;
            }

            Battle battle = new Battle();
            battle.setCampaign(campaign);
            battle.setTurnNumber(turnNumber);
            battle.setTerritory(territory);
            battle.setBattleStatus(BattleStatus.PENDING);
            battle.setBattleMode(BattleMode.TABLETOP);
            battle.setAttackerFaction(draft.attackerFaction());
            battle.setDefenderFaction(draft.defenderFaction());
            Battle savedBattle = battleRepository.save(battle);

            List<BattleParticipant> participants = new ArrayList<>();
            addParticipantsFromAttackOrders(savedBattle, draft.attackerOrders(), BattleParticipantSide.ATTACKER, participants, new LinkedHashSet<>());
            addDefenderParticipants(savedBattle, draft, territory, platoonStates, participants);
            participants.forEach(battleParticipantRepository::save);

            writeEvent(campaign, turnNumber, actorMember, "BATTLE_GENERATED", ResolutionVisibilityScope.PUBLIC,
                    territory, draft.attackerFaction(), draft.defenderFaction(), json(Map.of(
                            "battleId", savedBattle.getId().toString(),
                            "territoryId", territory.getId().toString(),
                            "attackerPlatoonCount", participants.stream().filter(p -> p.getSide() == BattleParticipantSide.ATTACKER).count(),
                            "defenderPlatoonCount", participants.stream().filter(p -> p.getSide() == BattleParticipantSide.DEFENDER).count()
                    )));
            battles.add(savedBattle);
        }
        return battles;
    }

    private BattleDraft determineBattleDraft(Map<UUID, List<PlatoonOrder>> attacksByFaction, TerritoryState territoryState) {
        List<Map.Entry<UUID, List<PlatoonOrder>>> attackEntries = new ArrayList<>(attacksByFaction.entrySet());
        attackEntries.sort(Comparator.comparing(entry -> entry.getKey().toString()));
        if (attackEntries.isEmpty()) {
            return null;
        }

        Faction controllingFaction = territoryState != null ? territoryState.getControllingFaction() : null;
        for (Map.Entry<UUID, List<PlatoonOrder>> entry : attackEntries) {
            Faction attackerFaction = entry.getValue().getFirst().getOrderSubmission().getFaction();
            if (controllingFaction != null && !controllingFaction.getId().equals(attackerFaction.getId())) {
                return new BattleDraft(attackerFaction, controllingFaction, entry.getValue(), List.of());
            }
        }

        if (attackEntries.size() > 1) {
            Map.Entry<UUID, List<PlatoonOrder>> attackerEntry = attackEntries.get(0);
            Map.Entry<UUID, List<PlatoonOrder>> defenderEntry = attackEntries.get(1);
            return new BattleDraft(
                    attackerEntry.getValue().getFirst().getOrderSubmission().getFaction(),
                    defenderEntry.getValue().getFirst().getOrderSubmission().getFaction(),
                    attackerEntry.getValue(),
                    defenderEntry.getValue()
            );
        }

        return null;
    }

    private void addParticipantsFromAttackOrders(Battle battle,
                                                 List<PlatoonOrder> attackOrders,
                                                 BattleParticipantSide side,
                                                 List<BattleParticipant> participants,
                                                 LinkedHashSet<UUID> seenPlatoonIds) {
        for (PlatoonOrder order : attackOrders) {
            if (!seenPlatoonIds.add(order.getPlatoon().getId())) {
                continue;
            }
            BattleParticipant participant = new BattleParticipant();
            participant.setBattle(battle);
            participant.setPlatoon(order.getPlatoon());
            participant.setSide(side);
            participants.add(participant);
        }
    }

    private void addDefenderParticipants(Battle battle,
                                         BattleDraft draft,
                                         Territory territory,
                                         List<PlatoonState> platoonStates,
                                         List<BattleParticipant> participants) {
        LinkedHashSet<UUID> seenPlatoonIds = participants.stream()
                .map(participant -> participant.getPlatoon().getId())
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);

        if (!draft.defenderOrders().isEmpty()) {
            addParticipantsFromAttackOrders(battle, draft.defenderOrders(), BattleParticipantSide.DEFENDER, participants, seenPlatoonIds);
            return;
        }

        platoonStates.stream()
                .filter(state -> state.getTerritory() != null && state.getTerritory().getId().equals(territory.getId()))
                .filter(state -> state.getPlatoon().getFaction().getId().equals(draft.defenderFaction().getId()))
                .forEach(state -> {
                    if (!seenPlatoonIds.add(state.getPlatoon().getId())) {
                        return;
                    }
                    BattleParticipant participant = new BattleParticipant();
                    participant.setBattle(battle);
                    participant.setPlatoon(state.getPlatoon());
                    participant.setSide(BattleParticipantSide.DEFENDER);
                    participant.setPreConditionBand(state.getReadinessStatus().name());
                    participants.add(participant);
                });
    }

    private void writeEvent(Campaign campaign,
                            int turnNumber,
                            CampaignMember actorMember,
                            String eventType,
                            ResolutionVisibilityScope visibilityScope,
                            Territory territory,
                            Faction actorFaction,
                            Faction targetFaction,
                            String payloadJson) {
        ResolutionEvent event = new ResolutionEvent();
        event.setCampaign(campaign);
        event.setTurnNumber(turnNumber);
        event.setPhase(CampaignPhase.RESOLUTION);
        event.setEventType(eventType);
        event.setVisibilityScope(visibilityScope);
        event.setTerritory(territory);
        event.setActorFaction(actorFaction);
        event.setTargetFaction(targetFaction);
        event.setPayloadJson(payloadJson);
        event.setCreatedByType(ResolutionEventCreatedByType.GM);
        event.setCreatedByMember(actorMember);
        resolutionEventRepository.save(event);
    }

    private CampaignResolutionResponse buildSummary(Campaign campaign, int turnNumber) {
        List<OrderSubmission> submissions = orderSubmissionRepository.findAllByCampaignIdAndTurnNumberOrderBySubmittedAtAsc(campaign.getId(), turnNumber);
        Map<UUID, Integer> orderCounts = new LinkedHashMap<>();
        if (!submissions.isEmpty()) {
            List<UUID> submissionIds = submissions.stream().map(OrderSubmission::getId).toList();
            for (PlatoonOrder order : platoonOrderRepository.findAllByOrderSubmissionIdInOrderByCreatedAtAsc(submissionIds)) {
                orderCounts.merge(order.getOrderSubmission().getId(), 1, Integer::sum);
            }
        }

        List<ResolutionSubmissionSummaryResponse> submissionResponses = submissions.stream()
                .filter(submission -> submission.getStatus() == OrderSubmissionStatus.REVEALED || submission.getStatus() == OrderSubmissionStatus.RESOLVED)
                .map(submission -> new ResolutionSubmissionSummaryResponse(
                        submission.getId(),
                        submission.getSubmittedByMember().getId(),
                        submission.getSubmittedByMember().getUser().getDisplayName(),
                        submission.getFaction().getId(),
                        submission.getFaction().getName(),
                        submission.getStatus(),
                        submission.getLockedAt(),
                        submission.getRevealAt(),
                        submission.getChecksum(),
                        orderCounts.getOrDefault(submission.getId(), 0)
                ))
                .toList();

        List<BattleSummaryResponse> battleResponses = battleRepository.findAllByCampaignIdAndTurnNumberOrderByCreatedAtAsc(campaign.getId(), turnNumber).stream()
                .map(this::toBattleSummary)
                .toList();
        List<ResolutionEventResponse> eventResponses = resolutionEventRepository.findAllByCampaignIdAndTurnNumberOrderByCreatedAtAsc(campaign.getId(), turnNumber).stream()
                .map(this::toEventResponse)
                .toList();

        return new CampaignResolutionResponse(
                campaign.getId(),
                turnNumber,
                campaign.getCurrentPhase(),
                submissionResponses.size(),
                battleResponses.size(),
                eventResponses.size(),
                submissionResponses,
                battleResponses,
                eventResponses
        );
    }

    private BattleSummaryResponse toBattleSummary(Battle battle) {
        List<BattleParticipantResponse> participants = battleParticipantRepository.findAllByBattleIdOrderByCreatedAtAsc(battle.getId()).stream()
                .map(participant -> new BattleParticipantResponse(
                        participant.getPlatoon().getId(),
                        participant.getPlatoon().getPlatoonKey(),
                        participant.getPlatoon().getName(),
                        participant.getSide(),
                        participant.getPlatoon().getFaction().getName(),
                        participant.getPlatoon().getNation() != null ? participant.getPlatoon().getNation().getName() : null,
                        participant.getPreConditionBand(),
                        participant.getPostConditionBand()
                ))
                .toList();

        return new BattleSummaryResponse(
                battle.getId(),
                battle.getTerritory().getId(),
                battle.getTerritory().getName(),
                battle.getBattleStatus(),
                battle.getBattleMode(),
                battle.getAttackerFaction().getId(),
                battle.getAttackerFaction().getName(),
                battle.getDefenderFaction().getId(),
                battle.getDefenderFaction().getName(),
                battle.getCreatedAt(),
                participants
        );
    }

    private ResolutionEventResponse toEventResponse(ResolutionEvent event) {
        return new ResolutionEventResponse(
                event.getId(),
                event.getEventType(),
                event.getVisibilityScope(),
                event.getTerritory() != null ? event.getTerritory().getId() : null,
                event.getTerritory() != null ? event.getTerritory().getName() : null,
                event.getActorFaction() != null ? event.getActorFaction().getId() : null,
                event.getActorFaction() != null ? event.getActorFaction().getName() : null,
                event.getTargetFaction() != null ? event.getTargetFaction().getId() : null,
                event.getTargetFaction() != null ? event.getTargetFaction().getName() : null,
                event.getPayloadJson(),
                event.getCreatedByType(),
                event.getCreatedByMember() != null ? event.getCreatedByMember().getId() : null,
                event.getCreatedAt()
        );
    }

    private String json(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new ApiException("RESOLUTION_SERIALIZATION_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize resolution payload");
        }
    }

    private record BattleDraft(Faction attackerFaction,
                               Faction defenderFaction,
                               List<PlatoonOrder> attackerOrders,
                               List<PlatoonOrder> defenderOrders) {
    }
}
