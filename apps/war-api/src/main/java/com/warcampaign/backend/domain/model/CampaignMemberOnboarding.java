package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.CampaignMemberActivationStatus;
import com.warcampaign.backend.domain.enums.CampaignMemberOnboardingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "campaign_member_onboarding",
        uniqueConstraints = @UniqueConstraint(name = "uq_campaign_member_onboarding_membership", columnNames = "membership_id"))
public class CampaignMemberOnboarding extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membership_id", nullable = false)
    private CampaignMember membership;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CampaignMemberOnboardingStatus status = CampaignMemberOnboardingStatus.REQUIRED;

    @Enumerated(EnumType.STRING)
    @Column(name = "activation_status", nullable = false, length = 30)
    private CampaignMemberActivationStatus activationStatus = CampaignMemberActivationStatus.ACTIVE;

    @Column(name = "activation_turn_number")
    private Integer activationTurnNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_faction_id")
    private Faction selectedFaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_nation_id")
    private Nation selectedNation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_homeland_territory_id")
    private Territory selectedHomelandTerritory;

    @Column(name = "tutorial_completed_at")
    private Instant tutorialCompletedAt;

    @Column(name = "tutorial_version", length = 80)
    private String tutorialVersion;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private Instant updatedAt;

    public CampaignMember getMembership() {
        return membership;
    }

    public void setMembership(CampaignMember membership) {
        this.membership = membership;
    }

    public CampaignMemberOnboardingStatus getStatus() {
        return status;
    }

    public void setStatus(CampaignMemberOnboardingStatus status) {
        this.status = status;
    }

    public CampaignMemberActivationStatus getActivationStatus() {
        return activationStatus;
    }

    public void setActivationStatus(CampaignMemberActivationStatus activationStatus) {
        this.activationStatus = activationStatus;
    }

    public Integer getActivationTurnNumber() {
        return activationTurnNumber;
    }

    public void setActivationTurnNumber(Integer activationTurnNumber) {
        this.activationTurnNumber = activationTurnNumber;
    }

    public Faction getSelectedFaction() {
        return selectedFaction;
    }

    public void setSelectedFaction(Faction selectedFaction) {
        this.selectedFaction = selectedFaction;
    }

    public Nation getSelectedNation() {
        return selectedNation;
    }

    public void setSelectedNation(Nation selectedNation) {
        this.selectedNation = selectedNation;
    }

    public Territory getSelectedHomelandTerritory() {
        return selectedHomelandTerritory;
    }

    public void setSelectedHomelandTerritory(Territory selectedHomelandTerritory) {
        this.selectedHomelandTerritory = selectedHomelandTerritory;
    }

    public Instant getTutorialCompletedAt() {
        return tutorialCompletedAt;
    }

    public void setTutorialCompletedAt(Instant tutorialCompletedAt) {
        this.tutorialCompletedAt = tutorialCompletedAt;
    }

    public String getTutorialVersion() {
        return tutorialVersion;
    }

    public void setTutorialVersion(String tutorialVersion) {
        this.tutorialVersion = tutorialVersion;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
