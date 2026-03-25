package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.TerritoryState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TerritoryStateRepository extends JpaRepository<TerritoryState, UUID> {
}
