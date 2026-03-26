package com.warcampaign.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;
import com.warcampaign.backend.domain.enums.PlatoonOrderType;
import com.warcampaign.backend.domain.enums.PlatoonOrderValidationStatus;
import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.OrderSubmission;
import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.domain.model.PlatoonOrder;
import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.dto.MyOrderSubmissionResponse;
import com.warcampaign.backend.dto.OrderLineRequest;
import com.warcampaign.backend.dto.PlatoonOrderResponse;
import com.warcampaign.backend.dto.SaveOrderSubmissionRequest;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.OrderSubmissionRepository;
import com.warcampaign.backend.repository.PlatoonOrderRepository;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import com.warcampaign.backend.repository.TerritoryRepository;
import com.warcampaign.backend.repository.TurnRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CampaignOrderService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final TurnRepository turnRepository;
    private final OrderSubmissionRepository orderSubmissionRepository;
    private final PlatoonOrderRepository platoonOrderRepository;
    private final PlatoonStateRepository platoonStateRepository;
    private final TerritoryRepository territoryRepository;
    private final ObjectMapper objectMapper;

    public CampaignOrderService(CampaignMemberRepository campaignMemberRepository,
                                TurnRepository turnRepository,
                                OrderSubmissionRepository orderSubmissionRepository,
                                PlatoonOrderRepository platoonOrderRepository,
                                PlatoonStateRepository platoonStateRepository,
                                TerritoryRepository territoryRepository,
                                ObjectMapper objectMapper) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.turnRepository = turnRepository;
        this.orderSubmissionRepository = orderSubmissionRepository;
        this.platoonOrderRepository = platoonOrderRepository;
        this.platoonStateRepository = platoonStateRepository;
        this.territoryRepository = territoryRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public MyOrderSubmissionResponse getMyOrders(UUID campaignId, int turnNumber, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requirePlayerMembership(campaignId, authenticatedUser.id());
        Turn turn = requireTurn(membership.getCampaign(), turnNumber);

        return orderSubmissionRepository.findByCampaignIdAndTurnNumberAndSubmittedByMemberId(campaignId, turn.getTurnNumber(), membership.getId())
                .map(this::toResponse)
                .orElseGet(() -> new MyOrderSubmissionResponse(
                        null,
                        campaignId,
                        turn.getTurnNumber(),
                        membership.getId(),
                        membership.getFaction().getId(),
                        OrderSubmissionStatus.DRAFT,
                        null,
                        null,
                        null,
                        List.of()
                ));
    }

    @Transactional
    public MyOrderSubmissionResponse saveMyOrders(UUID campaignId,
                                                  int turnNumber,
                                                  SaveOrderSubmissionRequest request,
                                                  AuthenticatedUser authenticatedUser) {
        if (request == null || request.orders() == null) {
            throw new ApiException("ORDER_SUBMISSION_INVALID", HttpStatus.BAD_REQUEST, "Orders payload is required");
        }

        CampaignMember membership = requirePlayerMembership(campaignId, authenticatedUser.id());
        Turn turn = requireTurn(membership.getCampaign(), turnNumber);
        requireEditableWindow(membership.getCampaign(), turn);

        OrderSubmission submission = orderSubmissionRepository
                .findByCampaignIdAndTurnNumberAndSubmittedByMemberId(campaignId, turnNumber, membership.getId())
                .orElseGet(() -> newSubmission(membership, turnNumber));

        if (submission.getStatus() == OrderSubmissionStatus.LOCKED) {
            throw new ApiException("ORDER_SUBMISSION_LOCKED", HttpStatus.CONFLICT, "Locked submissions cannot be edited");
        }

        List<ValidatedOrderLine> validatedOrders = validateOrders(membership, turn, request.orders());

        OrderSubmissionStatus status = validatedOrders.stream().allMatch(line -> line.validationStatus() == PlatoonOrderValidationStatus.VALID)
                ? OrderSubmissionStatus.VALIDATED
                : OrderSubmissionStatus.DRAFT;

        submission.setStatus(status);
        submission.setSubmittedAt(Instant.now());
        submission.setLockedAt(null);
        submission.setChecksum(null);
        OrderSubmission savedSubmission = orderSubmissionRepository.save(submission);

        platoonOrderRepository.deleteAllByOrderSubmissionId(savedSubmission.getId());
        List<PlatoonOrder> savedOrders = validatedOrders.stream()
                .map(line -> toEntity(savedSubmission, line))
                .map(platoonOrderRepository::save)
                .toList();

        return toResponse(savedSubmission, savedOrders);
    }

    @Transactional
    public MyOrderSubmissionResponse lockMyOrders(UUID campaignId, int turnNumber, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requirePlayerMembership(campaignId, authenticatedUser.id());
        Turn turn = requireTurn(membership.getCampaign(), turnNumber);
        requireEditableWindow(membership.getCampaign(), turn);

        OrderSubmission submission = orderSubmissionRepository
                .findByCampaignIdAndTurnNumberAndSubmittedByMemberId(campaignId, turnNumber, membership.getId())
                .orElseThrow(() -> new ApiException("ORDER_SUBMISSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Order submission not found"));

        List<PlatoonOrder> orders = platoonOrderRepository.findAllByOrderSubmissionIdOrderByCreatedAtAsc(submission.getId());
        if (orders.isEmpty()) {
            throw new ApiException("ORDER_SUBMISSION_EMPTY", HttpStatus.UNPROCESSABLE_ENTITY, "At least one order is required before locking");
        }
        if (submission.getStatus() == OrderSubmissionStatus.LOCKED) {
            return toResponse(submission, orders);
        }
        boolean hasInvalidOrders = orders.stream().anyMatch(order -> order.getValidationStatus() == PlatoonOrderValidationStatus.INVALID);
        if (hasInvalidOrders || submission.getStatus() != OrderSubmissionStatus.VALIDATED) {
            throw new ApiException("ORDER_SUBMISSION_INVALID", HttpStatus.UNPROCESSABLE_ENTITY, "Only validated submissions can be locked");
        }

        submission.setStatus(OrderSubmissionStatus.LOCKED);
        submission.setLockedAt(Instant.now());
        submission.setChecksum(calculateChecksum(orders));
        OrderSubmission savedSubmission = orderSubmissionRepository.save(submission);
        return toResponse(savedSubmission, orders);
    }

    private CampaignMember requirePlayerMembership(UUID campaignId, UUID userId) {
        CampaignMember membership = campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));

        if (membership.getRole() != CampaignRole.PLAYER) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "Player role required for order submission");
        }
        if (membership.getFaction() == null) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "Faction assignment required for order submission");
        }
        return membership;
    }

    private Turn requireTurn(Campaign campaign, int turnNumber) {
        return turnRepository.findByCampaignIdAndTurnNumber(campaign.getId(), turnNumber)
                .orElseThrow(() -> new ApiException("CAMPAIGN_TURN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign turn not found"));
    }

    private void requireEditableWindow(Campaign campaign, Turn turn) {
        if (campaign.getCurrentTurnNumber() != turn.getTurnNumber()) {
            throw new ApiException("ORDER_TURN_NOT_ACTIVE", HttpStatus.CONFLICT, "Orders can only be edited for the current turn");
        }
        if (campaign.getCurrentPhase() != CampaignPhase.OPERATIONS) {
            throw new ApiException("ORDER_PHASE_INVALID", HttpStatus.CONFLICT, "Orders can only be edited during the operations phase");
        }
    }

    private OrderSubmission newSubmission(CampaignMember membership, int turnNumber) {
        OrderSubmission submission = new OrderSubmission();
        submission.setCampaign(membership.getCampaign());
        submission.setTurnNumber(turnNumber);
        submission.setSubmittedByMember(membership);
        submission.setFaction(membership.getFaction());
        submission.setStatus(OrderSubmissionStatus.DRAFT);
        return submission;
    }

    private List<ValidatedOrderLine> validateOrders(CampaignMember membership, Turn turn, List<OrderLineRequest> requests) {
        List<OrderLineRequest> orderRequests = requests == null ? List.of() : requests;
        Map<UUID, PlatoonState> platoonStates = platoonStateRepository.findAllByCampaignIdAndTurnNumber(membership.getCampaign().getId(), turn.getTurnNumber()).stream()
                .collect(LinkedHashMap::new, (map, state) -> map.put(state.getPlatoon().getId(), state), LinkedHashMap::putAll);

        List<ValidatedOrderLine> results = new ArrayList<>();
        for (OrderLineRequest request : orderRequests) {
            results.add(validateSingleOrder(membership, request, platoonStates));
        }
        return results;
    }

    private ValidatedOrderLine validateSingleOrder(CampaignMember membership,
                                                   OrderLineRequest request,
                                                   Map<UUID, PlatoonState> platoonStates) {
        List<String> errors = new ArrayList<>();

        if (request == null) {
            throw new ApiException("ORDER_SUBMISSION_INVALID", HttpStatus.BAD_REQUEST, "Order entries cannot be null");
        }
        if (request.platoonId() == null || request.orderType() == null) {
            throw new ApiException("ORDER_SUBMISSION_INVALID", HttpStatus.BAD_REQUEST, "Each order requires platoonId and orderType");
        }

        PlatoonState platoonState = platoonStates.get(request.platoonId());
        if (platoonState == null) {
            throw new ApiException("PLATOON_NOT_FOUND", HttpStatus.NOT_FOUND, "Platoon not found");
        }
        Platoon platoon = platoonState.getPlatoon();
        if (!canControlPlatoon(platoon, membership)) {
            throw new ApiException("PLATOON_FORBIDDEN", HttpStatus.FORBIDDEN, "You cannot issue orders for this platoon");
        }

        Territory sourceTerritory = null;
        Territory targetTerritory = null;

        if (request.sourceTerritoryId() != null) {
            sourceTerritory = territoryRepository.findByIdAndCampaignId(request.sourceTerritoryId(), membership.getCampaign().getId())
                    .orElseThrow(() -> new ApiException("TERRITORY_NOT_FOUND", HttpStatus.NOT_FOUND, "Source territory not found"));
            if (platoonState.getTerritory() == null || !sourceTerritory.getId().equals(platoonState.getTerritory().getId())) {
                errors.add("SOURCE_TERRITORY_MISMATCH");
            }
        }

        if (request.targetTerritoryId() != null) {
            targetTerritory = territoryRepository.findByIdAndCampaignId(request.targetTerritoryId(), membership.getCampaign().getId())
                    .orElseThrow(() -> new ApiException("TERRITORY_NOT_FOUND", HttpStatus.NOT_FOUND, "Target territory not found"));
        }

        if (requiresTarget(request.orderType()) && targetTerritory == null) {
            errors.add("TARGET_TERRITORY_REQUIRED");
        }

        if (!requiresTarget(request.orderType()) && targetTerritory != null) {
            errors.add("TARGET_TERRITORY_NOT_ALLOWED");
        }

        return new ValidatedOrderLine(
                platoon,
                request.orderType(),
                sourceTerritory,
                targetTerritory,
                request.payloadJson(),
                errors.isEmpty() ? PlatoonOrderValidationStatus.VALID : PlatoonOrderValidationStatus.INVALID,
                errors.isEmpty() ? null : toJson(errors)
        );
    }

    private boolean canControlPlatoon(Platoon platoon, CampaignMember membership) {
        if (platoon.isHiddenFromPlayers()) {
            return false;
        }
        if (!platoon.getFaction().getId().equals(membership.getFaction().getId())) {
            return false;
        }
        return membership.getNation() == null
                || platoon.getNation() == null
                || platoon.getNation().getId().equals(membership.getNation().getId());
    }

    private boolean requiresTarget(PlatoonOrderType orderType) {
        return switch (orderType) {
            case MOVE, ATTACK, WITHDRAW, RECON, BOMBARD, REDEPLOY, SUPPORT, DIPLOMACY_ATTACH -> true;
            case HOLD, REFIT -> false;
        };
    }

    private PlatoonOrder toEntity(OrderSubmission submission, ValidatedOrderLine line) {
        PlatoonOrder order = new PlatoonOrder();
        order.setOrderSubmission(submission);
        order.setPlatoon(line.platoon());
        order.setOrderType(line.orderType());
        order.setSourceTerritory(line.sourceTerritory());
        order.setTargetTerritory(line.targetTerritory());
        order.setPayloadJson(line.payloadJson());
        order.setValidationStatus(line.validationStatus());
        order.setValidationErrorsJson(line.validationErrorsJson());
        return order;
    }

    private MyOrderSubmissionResponse toResponse(OrderSubmission submission) {
        List<PlatoonOrder> orders = platoonOrderRepository.findAllByOrderSubmissionIdOrderByCreatedAtAsc(submission.getId());
        return toResponse(submission, orders);
    }

    private MyOrderSubmissionResponse toResponse(OrderSubmission submission, List<PlatoonOrder> orders) {
        return new MyOrderSubmissionResponse(
                submission.getId(),
                submission.getCampaign().getId(),
                submission.getTurnNumber(),
                submission.getSubmittedByMember().getId(),
                submission.getFaction().getId(),
                submission.getStatus(),
                submission.getSubmittedAt(),
                submission.getLockedAt(),
                submission.getChecksum(),
                orders.stream()
                        .sorted(Comparator.comparing(order -> order.getPlatoon().getName()))
                        .map(this::toOrderResponse)
                        .toList()
        );
    }

    private PlatoonOrderResponse toOrderResponse(PlatoonOrder order) {
        return new PlatoonOrderResponse(
                order.getId(),
                order.getPlatoon().getId(),
                order.getPlatoon().getPlatoonKey(),
                order.getPlatoon().getName(),
                order.getOrderType(),
                order.getSourceTerritory() != null ? order.getSourceTerritory().getId() : null,
                order.getTargetTerritory() != null ? order.getTargetTerritory().getId() : null,
                order.getPayloadJson(),
                order.getValidationStatus(),
                order.getValidationErrorsJson(),
                order.getCreatedAt()
        );
    }

    private String calculateChecksum(List<PlatoonOrder> orders) {
        try {
            List<Map<String, Object>> checksumPayload = orders.stream()
                    .sorted(Comparator.comparing(order -> order.getPlatoon().getId()))
                    .map(order -> Map.<String, Object>of(
                            "platoonId", order.getPlatoon().getId().toString(),
                            "orderType", order.getOrderType().name(),
                            "sourceTerritoryId", order.getSourceTerritory() != null ? order.getSourceTerritory().getId().toString() : "",
                            "targetTerritoryId", order.getTargetTerritory() != null ? order.getTargetTerritory().getId().toString() : "",
                            "payloadJson", order.getPayloadJson() != null ? order.getPayloadJson() : "",
                            "validationStatus", order.getValidationStatus().name()
                    ))
                    .toList();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(objectMapper.writeValueAsString(checksumPayload).getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte value : hash) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new ApiException("ORDER_CHECKSUM_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to calculate order checksum");
        }
    }

    private String toJson(List<String> errors) {
        try {
            return objectMapper.writeValueAsString(errors);
        } catch (JsonProcessingException exception) {
            throw new ApiException("ORDER_SERIALIZATION_ERROR", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize validation errors");
        }
    }

    private record ValidatedOrderLine(Platoon platoon,
                                      PlatoonOrderType orderType,
                                      Territory sourceTerritory,
                                      Territory targetTerritory,
                                      String payloadJson,
                                      PlatoonOrderValidationStatus validationStatus,
                                      String validationErrorsJson) {
    }
}
