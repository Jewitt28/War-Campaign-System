package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import jakarta.persistence.*;

@Entity
@Table(name = "campaign")
public class Campaign extends BaseEntity {

    @Column(nullable = false, length = 180)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CampaignPhase currentPhase = CampaignPhase.LOBBY;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public CampaignPhase getCurrentPhase() {
        return currentPhase;
    }

    public void setCurrentPhase(CampaignPhase currentPhase) {
        this.currentPhase = currentPhase;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }
}
