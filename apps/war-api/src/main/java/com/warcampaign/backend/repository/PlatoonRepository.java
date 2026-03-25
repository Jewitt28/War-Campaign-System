package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.Platoon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PlatoonRepository extends JpaRepository<Platoon, UUID> {
}
