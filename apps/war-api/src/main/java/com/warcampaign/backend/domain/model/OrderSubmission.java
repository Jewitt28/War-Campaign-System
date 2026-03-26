package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.OrderSubmissionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "order_submission",
        uniqueConstraints = @UniqueConstraint(name = "uq_order_submission_campaign_turn_member",
                columnNames = {"campaign_id", "turn_number", "submitted_by_member_id"}))
public class OrderSubmission extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(name = "turn_number", nullable = false)
    private int turnNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_by_member_id", nullable = false)
    private CampaignMember submittedByMember;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "faction_id", nullable = false)
    private Faction faction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderSubmissionStatus status = OrderSubmissionStatus.DRAFT;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "locked_at")
    private Instant lockedAt;

    @Column(name = "reveal_at")
    private Instant revealAt;

    @Column(length = 128)
    private String checksum;

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

    public CampaignMember getSubmittedByMember() {
        return submittedByMember;
    }

    public void setSubmittedByMember(CampaignMember submittedByMember) {
        this.submittedByMember = submittedByMember;
    }

    public Faction getFaction() {
        return faction;
    }

    public void setFaction(Faction faction) {
        this.faction = faction;
    }

    public OrderSubmissionStatus getStatus() {
        return status;
    }

    public void setStatus(OrderSubmissionStatus status) {
        this.status = status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Instant getLockedAt() {
        return lockedAt;
    }

    public void setLockedAt(Instant lockedAt) {
        this.lockedAt = lockedAt;
    }

    public Instant getRevealAt() {
        return revealAt;
    }

    public void setRevealAt(Instant revealAt) {
        this.revealAt = revealAt;
    }

    public String getChecksum() {
        return checksum;
    }

    public void setChecksum(String checksum) {
        this.checksum = checksum;
    }
}
