package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "turn",
        uniqueConstraints = @UniqueConstraint(name = "uq_turn_campaign_number", columnNames = {"campaign_id", "turn_number"}))
public class Turn extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(name = "turn_number", nullable = false)
    private int turnNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CampaignPhase phase;

    @Column(nullable = false)
    private Instant startsAt;

    @Column
    private Instant endsAt;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public int getTurnNumber() {
        return turnNumber;
    }

    public void setTurnNumber(int turnNumber) {
        this.turnNumber = turnNumber;
    }

    public CampaignPhase getPhase() {
        return phase;
    }

    public void setPhase(CampaignPhase phase) {
        this.phase = phase;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public void setStartsAt(Instant startsAt) {
        this.startsAt = startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public void setEndsAt(Instant endsAt) {
        this.endsAt = endsAt;
    }
}
