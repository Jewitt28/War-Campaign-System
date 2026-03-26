package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.OrderSubmission;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrderSubmissionRepository extends JpaRepository<OrderSubmission, UUID> {

    @EntityGraph(attributePaths = {"submittedByMember", "submittedByMember.user", "faction"})
    Optional<OrderSubmission> findByCampaignIdAndTurnNumberAndSubmittedByMemberId(UUID campaignId, int turnNumber, UUID submittedByMemberId);
}
