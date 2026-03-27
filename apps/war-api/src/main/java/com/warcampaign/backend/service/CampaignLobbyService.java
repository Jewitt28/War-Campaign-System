package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.domain.model.Nation;
import com.warcampaign.backend.dto.CampaignDetailResponse;
import com.warcampaign.backend.dto.CampaignFactionResponse;
import com.warcampaign.backend.dto.CampaignMemberResponse;
import com.warcampaign.backend.dto.CampaignSummaryResponse;
import com.warcampaign.backend.dto.UpdateCampaignMemberRequest;
import com.warcampaign.backend.exception.ApiException;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import com.warcampaign.backend.repository.FactionRepository;
import com.warcampaign.backend.repository.NationRepository;
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
    private final NationRepository nationRepository;
    private final CampaignOnboardingService campaignOnboardingService;

    public CampaignLobbyService(CampaignMemberRepository campaignMemberRepository,
                                FactionRepository factionRepository,
                                NationRepository nationRepository,
                                CampaignOnboardingService campaignOnboardingService) {
        this.campaignMemberRepository = campaignMemberRepository;
        this.factionRepository = factionRepository;
        this.nationRepository = nationRepository;
        this.campaignOnboardingService = campaignOnboardingService;
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

        if (request.role() != null) {
            member.setRole(request.role());
        }

        Faction faction = member.getFaction();
        if (request.factionId() != null) {
            faction = factionRepository.findByIdAndCampaignId(request.factionId(), campaignId)
                    .orElseThrow(() -> new ApiException("FACTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Faction not found"));
            member.setFaction(faction);
        }

        if (request.nationId() != null) {
            Nation nation = nationRepository.findByIdAndCampaignId(request.nationId(), campaignId)
                    .orElseThrow(() -> new ApiException("NATION_NOT_FOUND", HttpStatus.NOT_FOUND, "Nation not found"));
            if (faction != null && nation.getFaction() != null && !nation.getFaction().getId().equals(faction.getId())) {
                throw new ApiException("MEMBER_ASSIGNMENT_INVALID", HttpStatus.UNPROCESSABLE_ENTITY, "Nation does not belong to the assigned faction");
            }
            member.setNation(nation);
            if (member.getFaction() == null && nation.getFaction() != null) {
                member.setFaction(nation.getFaction());
            }
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
                memberCount,
                campaignOnboardingService.getMemberOnboardingSummary(membership)
        );
    }

    private CampaignMemberResponse toMemberResponse(CampaignMember membership) {
        return new CampaignMemberResponse(
                membership.getId(),
                membership.getUser().getId(),
                membership.getUser().getEmail(),
                membership.getUser().getDisplayName(),
                membership.getRole(),
                membership.getFaction() != null ? membership.getFaction().getId() : null,
                membership.getNation() != null ? membership.getNation().getId() : null,
                campaignOnboardingService.getMemberOnboardingSummary(membership)
        );
    }

    private CampaignFactionResponse toFactionResponse(Faction faction) {
        return new CampaignFactionResponse(
                faction.getId(),
                faction.getFactionKey(),
                faction.getName(),
                faction.getType().name(),
                faction.getColor(),
                faction.isPlayerControlled()
        );
    }
}
