package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Territory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TerritoryRepository extends JpaRepository<Territory, UUID> {
}
