package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.enums.CampaignMemberActivationStatus;
import com.warcampaign.backend.domain.model.CampaignMemberOnboarding;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampaignMemberOnboardingRepository extends JpaRepository<CampaignMemberOnboarding, UUID> {

    @EntityGraph(attributePaths = {
            "membership",
            "membership.campaign",
            "membership.user",
            "membership.faction",
            "membership.nation",
            "selectedFaction",
            "selectedNation",
            "selectedHomelandTerritory"
    })
    Optional<CampaignMemberOnboarding> findByMembershipId(UUID membershipId);

    @EntityGraph(attributePaths = {
            "membership",
            "membership.campaign",
            "membership.user",
            "membership.faction",
            "membership.nation",
            "selectedFaction",
            "selectedNation",
            "selectedHomelandTerritory"
    })
    Optional<CampaignMemberOnboarding> findByMembershipCampaignIdAndMembershipUserId(UUID campaignId, UUID userId);

    @EntityGraph(attributePaths = {
            "membership",
            "membership.user",
            "selectedFaction",
            "selectedNation",
            "selectedHomelandTerritory"
    })
    List<CampaignMemberOnboarding> findAllByMembershipCampaignId(UUID campaignId);

    @EntityGraph(attributePaths = {
            "membership",
            "membership.campaign",
            "membership.user",
            "selectedFaction",
            "selectedNation",
            "selectedHomelandTerritory"
    })
    List<CampaignMemberOnboarding> findAllByMembershipCampaignIdAndActivationStatusAndActivationTurnNumber(
            UUID campaignId,
            CampaignMemberActivationStatus activationStatus,
            Integer activationTurnNumber
    );

    @EntityGraph(attributePaths = {
            "membership",
            "selectedFaction",
            "selectedNation",
            "selectedHomelandTerritory"
    })
    List<CampaignMemberOnboarding> findAllByMembershipCampaignIdAndMembershipIdNotIn(UUID campaignId, Collection<UUID> membershipIds);
}
