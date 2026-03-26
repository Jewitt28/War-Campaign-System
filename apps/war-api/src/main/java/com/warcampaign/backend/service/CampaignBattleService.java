package com.warcampaign.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warcampaign.backend.domain.enums.BattleStatus;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.ResolutionEventCreatedByType;
import com.warcampaign.backend.domain.enums.ResolutionVisibilityScope;
import com.warcampaign.backend.domain.model.Battle;
import com.warcampaign.backend.domain.model.BattleParticipant;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.ResolutionEvent;
import com.warcampaign.backend.dto.BattleDetailResponse;
import com.warcampaign.backend.dto.BattleParticipantResponse;
import com.warcampaign.backend.dto.BattleParticipantResultRequest;
import com.warcampaign.backend.dto.RecordBattleResultRequest;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.BattleParticipantRepository;
import com.warcampaign.backend.repository.BattleRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.ResolutionEventRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CampaignBattleService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final BattleRepository battleRepository;
    private final BattleParticipantRepository battleParticipantRepository;
    private final ResolutionEventRepository resolutionEventRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    public CampaignBattleService(CampaignMemberRepository campaignMemberRepository,
                                 BattleRepository battleRepository,
                                 BattleParticipantRepository battleParticipantRepository,
                                 ResolutionEventRepository resolutionEventRepository,
                                 NotificationService notificationService,
                                 ObjectMapper objectMapper) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.battleRepository = battleRepository;
        this.battleParticipantRepository = battleParticipantRepository;
        this.resolutionEventRepository = resolutionEventRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public BattleDetailResponse getBattle(UUID campaignId, UUID battleId, AuthenticatedUser authenticatedUser) {
        requireMembership(campaignId, authenticatedUser.id());
        return toDetailResponse(requireBattle(campaignId, battleId));
    }

    @Transactional
    public BattleDetailResponse recordBattleResult(UUID campaignId,
                                                   UUID battleId,
                                                   RecordBattleResultRequest request,
                                                   AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        if (membership.getRole() != CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required for battle result entry");
        }

        Battle battle = requireBattle(campaignId, battleId);
        if (battle.getBattleStatus() == BattleStatus.RESOLVED) {
            throw new ApiException("BATTLE_ALREADY_RESOLVED", HttpStatus.CONFLICT, "Battle result has already been recorded");
        }
        if (battle.getBattleStatus() == BattleStatus.CANCELLED) {
            throw new ApiException("BATTLE_RESULT_INVALID", HttpStatus.CONFLICT, "Cancelled battles cannot accept results");
        }
        if (request.tabletopResultSummary() == null || request.tabletopResultSummary().isBlank()) {
            throw new ApiException("BATTLE_RESULT_INVALID", HttpStatus.BAD_REQUEST, "Battle result summary is required");
        }

        Faction winner = validateWinnerFaction(battle, request.winnerFactionId());
        applyParticipantResults(battle, request.participantResults());

        Map<String, Object> strategicResult = new LinkedHashMap<>();
        strategicResult.put("winnerFactionId", winner != null ? winner.getId().toString() : null);
        strategicResult.put("winnerFactionName", winner != null ? winner.getName() : null);
        strategicResult.put("recordedAt", Instant.now().toString());

        battle.setBattleStatus(BattleStatus.RESOLVED);
        battle.setTabletopResultSummary(request.tabletopResultSummary().trim());
        battle.setStrategicResultJson(json(strategicResult));
        Battle savedBattle = battleRepository.save(battle);

        ResolutionEvent event = new ResolutionEvent();
        event.setCampaign(savedBattle.getCampaign());
        event.setTurnNumber(savedBattle.getTurnNumber());
        event.setPhase(savedBattle.getCampaign().getCurrentPhase());
        event.setEventType("BATTLE_RESULT_RECORDED");
        event.setVisibilityScope(ResolutionVisibilityScope.PUBLIC);
        event.setTerritory(savedBattle.getTerritory());
        event.setActorFaction(savedBattle.getAttackerFaction());
        event.setTargetFaction(savedBattle.getDefenderFaction());
        event.setPayloadJson(json(Map.of(
                "battleId", savedBattle.getId().toString(),
                "winnerFactionId", winner != null ? winner.getId().toString() : null,
                "status", savedBattle.getBattleStatus().name()
        )));
        event.setCreatedByType(ResolutionEventCreatedByType.GM);
        event.setCreatedByMember(membership);
        resolutionEventRepository.save(event);

        notificationService.notifyCampaignMembers(
                savedBattle.getCampaign(),
                "BATTLE_RESULT_RECORDED",
                "Battle result recorded",
                "Battle results were recorded for " + savedBattle.getTerritory().getName() + " in " + savedBattle.getCampaign().getName() + ".",
                json(Map.of(
                        "battleId", savedBattle.getId().toString(),
                        "campaignId", savedBattle.getCampaign().getId().toString(),
                        "turnNumber", savedBattle.getTurnNumber()
                ))
        );

        return toDetailResponse(savedBattle);
    }

    private CampaignMember requireMembership(UUID campaignId, UUID userId) {
        return campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    private Battle requireBattle(UUID campaignId, UUID battleId) {
        return battleRepository.findByIdAndCampaignId(battleId, campaignId)
                .orElseThrow(() -> new ApiException("BATTLE_NOT_FOUND", HttpStatus.NOT_FOUND, "Battle not found"));
    }

    private Faction validateWinnerFaction(Battle battle, UUID winnerFactionId) {
        if (winnerFactionId == null) {
            return null;
        }
        if (battle.getAttackerFaction().getId().equals(winnerFactionId)) {
            return battle.getAttackerFaction();
        }
        if (battle.getDefenderFaction().getId().equals(winnerFactionId)) {
            return battle.getDefenderFaction();
        }
        throw new ApiException("BATTLE_RESULT_INVALID", HttpStatus.BAD_REQUEST, "Winner faction must be part of the battle");
    }

    private void applyParticipantResults(Battle battle, List<BattleParticipantResultRequest> participantResults) {
        if (participantResults == null || participantResults.isEmpty()) {
            return;
        }
        Map<UUID, BattleParticipant> participantsByPlatoonId = battleParticipantRepository.findAllByBattleIdOrderByCreatedAtAsc(battle.getId()).stream()
                .collect(Collectors.toMap(participant -> participant.getPlatoon().getId(), Function.identity(), (left, right) -> left, LinkedHashMap::new));

        for (BattleParticipantResultRequest result : participantResults) {
            BattleParticipant participant = participantsByPlatoonId.get(result.platoonId());
            if (participant == null) {
                throw new ApiException("BATTLE_RESULT_INVALID", HttpStatus.BAD_REQUEST, "Platoon does not belong to this battle");
            }
            participant.setPostConditionBand(result.postConditionBand());
            battleParticipantRepository.save(participant);
        }
    }

    private BattleDetailResponse toDetailResponse(Battle battle) {
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

        return new BattleDetailResponse(
                battle.getId(),
                battle.getCampaign().getId(),
                battle.getTurnNumber(),
                battle.getTerritory().getId(),
                battle.getTerritory().getName(),
                battle.getBattleStatus(),
                battle.getBattleMode(),
                battle.getAttackerFaction().getId(),
                battle.getAttackerFaction().getName(),
                battle.getDefenderFaction().getId(),
                battle.getDefenderFaction().getName(),
                battle.getScenarioKey(),
                battle.getScheduledFor(),
                battle.getTabletopResultSummary(),
                battle.getStrategicResultJson(),
                battle.getCreatedAt(),
                participants
        );
    }

    private String json(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new ApiException("BATTLE_SERIALIZATION_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize battle payload");
        }
    }
}
