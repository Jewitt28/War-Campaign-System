package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.domain.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampaignMemberRepository extends JpaRepository<CampaignMember, UUID> {

    Optional<CampaignMember> findByCampaignAndUser(Campaign campaign, User user);

    @EntityGraph(attributePaths = {"campaign", "campaign.createdBy"})
    @Query("select cm from CampaignMember cm where cm.user.id = :userId order by cm.campaign.name asc")
    List<CampaignMember> findAllByUserIdWithCampaign(UUID userId);

    @EntityGraph(attributePaths = {"campaign", "campaign.createdBy", "user", "faction", "nation"})
    @Query("select cm from CampaignMember cm where cm.campaign.id = :campaignId and cm.user.id = :userId")
    Optional<CampaignMember> findByCampaignIdAndUserIdWithCampaign(UUID campaignId, UUID userId);

    @EntityGraph(attributePaths = {"user", "faction", "nation"})
    @Query("select cm from CampaignMember cm where cm.campaign.id = :campaignId order by cm.user.displayName asc")
    List<CampaignMember> findAllByCampaignIdWithUser(UUID campaignId);

    @EntityGraph(attributePaths = {"campaign", "user", "faction", "nation"})
    Optional<CampaignMember> findFirstByCampaignIdAndRole(UUID campaignId, CampaignRole role);

    Optional<CampaignMember> findByIdAndCampaignId(UUID memberId, UUID campaignId);

    long countByCampaignId(UUID campaignId);

    @Query("""
            select cm.campaign.id as campaignId, count(cm) as memberCount
            from CampaignMember cm
            where cm.campaign.id in :campaignIds
            group by cm.campaign.id
            """)
    List<CampaignMemberCountView> countMembersByCampaignIds(Collection<UUID> campaignIds);

    interface CampaignMemberCountView {
        UUID getCampaignId();

        long getMemberCount();
    }
}
