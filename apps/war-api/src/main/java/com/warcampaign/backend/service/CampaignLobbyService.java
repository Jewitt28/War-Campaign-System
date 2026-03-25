package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.dto.CampaignDetailResponse;
import com.warcampaign.backend.dto.CampaignFactionResponse;
import com.warcampaign.backend.dto.CampaignMemberResponse;
import com.warcampaign.backend.dto.CampaignSummaryResponse;
import com.warcampaign.backend.dto.UpdateCampaignMemberRequest;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CampaignLobbyService {

    private final CampaignMemberRepository campaignMemberRepository;
    private final FactionRepository factionRepository;

    public CampaignLobbyService(CampaignMemberRepository campaignMemberRepository,
                                FactionRepository factionRepository) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.factionRepository = factionRepository;
    }

    @Transactional(readOnly = true)
    public List<CampaignSummaryResponse> listCampaigns(AuthenticatedUser authenticatedUser) {
        List<CampaignMember> memberships = campaignMemberRepository.findAllByUserIdWithCampaign(authenticatedUser.id());
        if (memberships.isEmpty()) {
            return List.of();
        }

        Map<UUID, Long> memberCounts = campaignMemberRepository.countMembersByCampaignIds(
                        memberships.stream().map(membership -> membership.getCampaign().getId()).toList())
                .stream()
                .collect(Collectors.toMap(
                        CampaignMemberRepository.CampaignMemberCountView::getCampaignId,
                        CampaignMemberRepository.CampaignMemberCountView::getMemberCount
                ));

        return memberships.stream()
                .map(membership -> toSummaryResponse(membership, memberCounts.getOrDefault(membership.getCampaign().getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public CampaignDetailResponse getCampaign(UUID campaignId, AuthenticatedUser authenticatedUser) {
        CampaignMember membership = requireMembership(campaignId, authenticatedUser.id());
        Campaign campaign = membership.getCampaign();
        long memberCount = campaignMemberRepository.countByCampaignId(campaignId);
        List<CampaignFactionResponse> factions = factionRepository.findAllByCampaignIdOrderByNameAsc(campaignId)
                .stream()
                .map(this::toFactionResponse)
                .toList();

        return new CampaignDetailResponse(
                campaign.getId(),
                campaign.getName(),
                campaign.getCurrentPhase(),
                campaign.getCreatedBy().getId(),
                campaign.getCreatedBy().getDisplayName(),
                memberCount,
                toMemberResponse(membership),
                factions
        );
    }

    @Transactional(readOnly = true)
    public List<CampaignMemberResponse> listMembers(UUID campaignId, AuthenticatedUser authenticatedUser) {
        requireMembership(campaignId, authenticatedUser.id());
        return campaignMemberRepository.findAllByCampaignIdWithUser(campaignId).stream()
                .map(this::toMemberResponse)
                .toList();
    }

    @Transactional
    public CampaignMemberResponse updateMember(UUID campaignId,
                                               UUID memberId,
                                               UpdateCampaignMemberRequest request,
                                               AuthenticatedUser authenticatedUser) {
        if (!request.hasChanges()) {
            throw new ApiException("MEMBER_UPDATE_EMPTY", HttpStatus.BAD_REQUEST, "At least one member field must be provided");
        }

        CampaignMember actingMembership = requireMembership(campaignId, authenticatedUser.id());
        if (actingMembership.getRole() != com.warcampaign.backend.domain.enums.CampaignRole.GM) {
            throw new ApiException("CAMPAIGN_FORBIDDEN", HttpStatus.FORBIDDEN, "GM role required for member updates");
        }

        CampaignMember member = campaignMemberRepository.findByIdAndCampaignId(memberId, campaignId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_MEMBER_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign member not found"));

        if (request.factionId() != null || request.nationId() != null) {
            throw new ApiException(
                    "MEMBER_ASSIGNMENT_UNSUPPORTED",
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Faction and nation assignments are not yet supported by the current schema"
            );
        }

        if (request.role() != null) {
            member.setRole(request.role());
        }

        CampaignMember saved = campaignMemberRepository.save(member);
        return toMemberResponse(saved);
    }

    private CampaignMember requireMembership(UUID campaignId, UUID userId) {
        return campaignMemberRepository.findByCampaignIdAndUserIdWithCampaign(campaignId, userId)
                .orElseThrow(() -> new ApiException("CAMPAIGN_NOT_FOUND", HttpStatus.NOT_FOUND, "Campaign not found"));
    }

    private CampaignSummaryResponse toSummaryResponse(CampaignMember membership, long memberCount) {
        Campaign campaign = membership.getCampaign();
        return new CampaignSummaryResponse(
                campaign.getId(),
                campaign.getName(),
                campaign.getCurrentPhase(),
                membership.getRole(),
                memberCount
        );
    }

    private CampaignMemberResponse toMemberResponse(CampaignMember membership) {
        return new CampaignMemberResponse(
                membership.getId(),
                membership.getUser().getId(),
                membership.getUser().getEmail(),
                membership.getUser().getDisplayName(),
                membership.getRole(),
                null,
                null
        );
    }

    private CampaignFactionResponse toFactionResponse(Faction faction) {
        return new CampaignFactionResponse(faction.getId(), faction.getFactionKey(), faction.getName());
    }
}
