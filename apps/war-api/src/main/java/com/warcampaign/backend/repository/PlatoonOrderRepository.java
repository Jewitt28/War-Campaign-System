package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.PlatoonOrder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlatoonOrderRepository extends JpaRepository<PlatoonOrder, UUID> {

    @EntityGraph(attributePaths = {"platoon", "sourceTerritory", "targetTerritory"})
    List<PlatoonOrder> findAllByOrderSubmissionIdOrderByCreatedAtAsc(UUID orderSubmissionId);

    void deleteAllByOrderSubmissionId(UUID orderSubmissionId);
}
