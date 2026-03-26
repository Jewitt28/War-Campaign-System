package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.ResolutionEventCreatedByType;
import com.warcampaign.backend.domain.enums.ResolutionVisibilityScope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "resolution_event")
public class ResolutionEvent extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(name = "turn_number", nullable = false)
    private int turnNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CampaignPhase phase;

    @Column(name = "event_type", nullable = false, length = 80)
    private String eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility_scope", nullable = false, length = 20)
    private ResolutionVisibilityScope visibilityScope;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewer_faction_id")
    private Faction viewerFaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "territory_id")
    private Territory territory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_faction_id")
    private Faction actorFaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_faction_id")
    private Faction targetFaction;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "created_by_type", nullable = false, length = 20)
    private ResolutionEventCreatedByType createdByType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_member_id")
    private CampaignMember createdByMember;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

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

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public ResolutionVisibilityScope getVisibilityScope() {
        return visibilityScope;
    }

    public void setVisibilityScope(ResolutionVisibilityScope visibilityScope) {
        this.visibilityScope = visibilityScope;
    }

    public Faction getViewerFaction() {
        return viewerFaction;
    }

    public void setViewerFaction(Faction viewerFaction) {
        this.viewerFaction = viewerFaction;
    }

    public Territory getTerritory() {
        return territory;
    }

    public void setTerritory(Territory territory) {
        this.territory = territory;
    }

    public Faction getActorFaction() {
        return actorFaction;
    }

    public void setActorFaction(Faction actorFaction) {
        this.actorFaction = actorFaction;
    }

    public Faction getTargetFaction() {
        return targetFaction;
    }

    public void setTargetFaction(Faction targetFaction) {
        this.targetFaction = targetFaction;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public ResolutionEventCreatedByType getCreatedByType() {
        return createdByType;
    }

    public void setCreatedByType(ResolutionEventCreatedByType createdByType) {
        this.createdByType = createdByType;
    }

    public CampaignMember getCreatedByMember() {
        return createdByMember;
    }

    public void setCreatedByMember(CampaignMember createdByMember) {
        this.createdByMember = createdByMember;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
