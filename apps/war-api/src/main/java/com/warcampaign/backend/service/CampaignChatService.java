package com.warcampaign.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.warcampaign.backend.domain.enums.AuditActorType;
import com.warcampaign.backend.domain.model.CampaignAuditLog;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.dto.CampaignChatMessageResponse;
import com.warcampaign.backend.dto.PostCampaignWorldChatMessageRequest;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignAuditLogRepository;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CampaignChatService {

    private static final String WORLD_CHAT_ACTION = "WORLD_CHAT_MESSAGE";
    private static final String WORLD_CHAT_ENTITY = "CAMPAIGN_WORLD_CHAT";

    private final CampaignMemberRepository campaignMemberRepository;
    private final CampaignAuditLogRepository campaignAuditLogRepository;
    private final ObjectMapper objectMapper;

    public CampaignChatService(CampaignMemberRepository campaignMemberRepository,
                               CampaignAuditLogRepository campaignAuditLogRepository,
                               ObjectMapper objectMapper) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.campaignAuditLogRepository = campaignAuditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<CampaignChatMessageResponse> listWorldMessages(UUID campaignId, AuthenticatedUser authenticatedUser) {
        requireMembership(campaignId, authenticatedUser.id());
        return campaignAuditLogRepository.findAllByCampaignIdOrderByCreatedAtAsc(campaignId).stream()
                .filter(entry -> WORLD_CHAT_ACTION.equals(entry.getActionType()) && WORLD_CHAT_ENTITY.equals(entry.getEntityType()))
                .sorted(Comparator.comparing(CampaignAuditLog::getCreatedAt).reversed())
                .map(this::toMessageResponse)
                .toList();
    }

    @Transactional
    public CampaignChatMessageResponse postWorldMessage(UUID campaignId,
                                                        PostCampaignWorldChatMessageRequest request,
                                                        AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        if (request.message() == null || request.message().isBlank()) {
            throw new ApiException("CHAT_MESSAGE_INVALID", HttpStatus.BAD_REQUEST, "World chat message is required");
        }

        CampaignAuditLog auditLog = new CampaignAuditLog();
        auditLog.setCampaign(membership.getCampaign());
        auditLog.setActorType(AuditActorType.USER);
        auditLog.setActorUser(membership.getUser());
        auditLog.setActorMember(membership);
        auditLog.setActionType(WORLD_CHAT_ACTION);
        auditLog.setEntityType(WORLD_CHAT_ENTITY);
        auditLog.setEntityId(UUID.randomUUID());
        auditLog.setAfterJson(writePayload(Map.of("message", request.message().trim())));
        return toMessageResponse(campaignAuditLogRepository.save(auditLog));
    }

    private CampaignMember requireMembership(UUID campaignId, UUID userId) {
        return campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    private CampaignChatMessageResponse toMessageResponse(CampaignAuditLog entry) {
        JsonNode payload = readTree(entry.getAfterJson());
        return new CampaignChatMessageResponse(
                entry.getId(),
                entry.getActorMember() != null ? entry.getActorMember().getId() : null,
                entry.getActorMember() != null && entry.getActorMember().getUser() != null
                        ? entry.getActorMember().getUser().getDisplayName()
                        : entry.getActorType().name(),
                payload.path("message").asText(""),
                entry.getCreatedAt()
        );
    }

    private JsonNode readTree(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(rawJson);
        } catch (JsonProcessingException exception) {
            throw new ApiException("CHAT_MESSAGE_INVALID", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to parse world chat payload");
        }
    }

    private String writePayload(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new ApiException("CHAT_MESSAGE_INVALID", HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize world chat payload");
        }
    }
}
