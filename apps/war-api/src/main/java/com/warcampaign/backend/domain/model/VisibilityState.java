package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.VisibilityLevel;
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
@Table(name = "visibility_state",
        uniqueConstraints = @UniqueConstraint(name = "uq_visibility_state_territory_viewer_turn",
                columnNames = {"territory_id", "viewer_faction_id", "turn_number"}))
public class VisibilityState extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "territory_id", nullable = false)
    private Territory territory;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viewer_faction_id", nullable = false)
    private Faction viewerFaction;

    @Column(name = "turn_number", nullable = false)
    private int turnNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility_level", nullable = false, length = 20)
    private VisibilityLevel visibilityLevel = VisibilityLevel.UNKNOWN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visible_owner_faction_id")
    private Faction visibleOwnerFaction;

    @Column(name = "visible_fort_level")
    private Integer visibleFortLevel;

    @Column(name = "visible_forces_summary", columnDefinition = "TEXT")
    private String visibleForcesSummary;

    @Column(name = "source_type", nullable = false, length = 40)
    private String sourceType;

    @Column(name = "confidence_score")
    private Integer confidenceScore;

    @Column(name = "decay_turn")
    private Integer decayTurn;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public Territory getTerritory() {
        return territory;
    }

    public void setTerritory(Territory territory) {
        this.territory = territory;
    }

    public Faction getViewerFaction() {
        return viewerFaction;
    }

    public void setViewerFaction(Faction viewerFaction) {
        this.viewerFaction = viewerFaction;
    }

    public int getTurnNumber() {
        return turnNumber;
    }

    public void setTurnNumber(int turnNumber) {
        this.turnNumber = turnNumber;
    }

    public VisibilityLevel getVisibilityLevel() {
        return visibilityLevel;
    }

    public void setVisibilityLevel(VisibilityLevel visibilityLevel) {
        this.visibilityLevel = visibilityLevel;
    }

    public Faction getVisibleOwnerFaction() {
        return visibleOwnerFaction;
    }

    public void setVisibleOwnerFaction(Faction visibleOwnerFaction) {
        this.visibleOwnerFaction = visibleOwnerFaction;
    }

    public Integer getVisibleFortLevel() {
        return visibleFortLevel;
    }

    public void setVisibleFortLevel(Integer visibleFortLevel) {
        this.visibleFortLevel = visibleFortLevel;
    }

    public String getVisibleForcesSummary() {
        return visibleForcesSummary;
    }

    public void setVisibleForcesSummary(String visibleForcesSummary) {
        this.visibleForcesSummary = visibleForcesSummary;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public Integer getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(Integer confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public Integer getDecayTurn() {
        return decayTurn;
    }

    public void setDecayTurn(Integer decayTurn) {
        this.decayTurn = decayTurn;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
