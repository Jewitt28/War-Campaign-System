package com.warcampaign.backend.repository;

import com.warcampaign.backend.domain.model.PlatoonState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PlatoonStateRepository extends JpaRepository<PlatoonState, UUID> {
}
