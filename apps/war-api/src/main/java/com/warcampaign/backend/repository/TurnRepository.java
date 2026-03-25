package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Turn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TurnRepository extends JpaRepository<Turn, UUID> {
}
