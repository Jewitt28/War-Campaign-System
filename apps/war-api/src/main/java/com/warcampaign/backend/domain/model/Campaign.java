package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.CampaignPhase;
import com.warcampaign.backend.domain.enums.CampaignStatus;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "campaign")
public class Campaign extends BaseEntity {

    @Column(nullable = false, length = 180)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CampaignPhase currentPhase = CampaignPhase.LOBBY;

    @Column(name = "current_turn_number", nullable = false)
    private int currentTurnNumber = 1;

    @Column(name = "ruleset_version", nullable = false, length = 40)
    private String rulesetVersion = "alpha-1";

    @Enumerated(EnumType.STRING)
    @Column(name = "campaign_status", nullable = false, length = 20)
    private CampaignStatus campaignStatus = CampaignStatus.DRAFT;

    @Column(name = "phase_started_at")
    private Instant phaseStartedAt;

    @Column(name = "phase_ends_at")
    private Instant phaseEndsAt;

    @Column(name = "gm_controls_enabled", nullable = false)
    private boolean gmControlsEnabled = true;

    @Column(name = "fog_of_war_enabled", nullable = false)
    private boolean fogOfWarEnabled = true;

    @Column(name = "timers_enabled", nullable = false)
    private boolean timersEnabled;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

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

    public int getCurrentTurnNumber() {
        return currentTurnNumber;
    }

    public void setCurrentTurnNumber(int currentTurnNumber) {
        this.currentTurnNumber = currentTurnNumber;
    }

    public String getRulesetVersion() {
        return rulesetVersion;
    }

    public void setRulesetVersion(String rulesetVersion) {
        this.rulesetVersion = rulesetVersion;
    }

    public CampaignStatus getCampaignStatus() {
        return campaignStatus;
    }

    public void setCampaignStatus(CampaignStatus campaignStatus) {
        this.campaignStatus = campaignStatus;
    }

    public Instant getPhaseStartedAt() {
        return phaseStartedAt;
    }

    public void setPhaseStartedAt(Instant phaseStartedAt) {
        this.phaseStartedAt = phaseStartedAt;
    }

    public Instant getPhaseEndsAt() {
        return phaseEndsAt;
    }

    public void setPhaseEndsAt(Instant phaseEndsAt) {
        this.phaseEndsAt = phaseEndsAt;
    }

    public boolean isGmControlsEnabled() {
        return gmControlsEnabled;
    }

    public void setGmControlsEnabled(boolean gmControlsEnabled) {
        this.gmControlsEnabled = gmControlsEnabled;
    }

    public boolean isFogOfWarEnabled() {
        return fogOfWarEnabled;
    }

    public void setFogOfWarEnabled(boolean fogOfWarEnabled) {
        this.fogOfWarEnabled = fogOfWarEnabled;
    }

    public boolean isTimersEnabled() {
        return timersEnabled;
    }

    public void setTimersEnabled(boolean timersEnabled) {
        this.timersEnabled = timersEnabled;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }
}
