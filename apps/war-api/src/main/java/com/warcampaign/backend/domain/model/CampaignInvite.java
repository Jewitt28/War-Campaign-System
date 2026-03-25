package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.CampaignRole;
import com.warcampaign.backend.domain.enums.InviteStatus;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "campaign_invite")
public class CampaignInvite extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invited_by_user_id", nullable = false)
    private User invitedBy;

    @Column(nullable = false, length = 320)
    private String inviteeEmail;

    @Column(nullable = false, unique = true, length = 100)
    private String inviteToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CampaignRole intendedRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InviteStatus status = InviteStatus.PENDING;

    @Column(nullable = false)
    private Instant expiresAt;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public User getInvitedBy() {
        return invitedBy;
    }

    public void setInvitedBy(User invitedBy) {
        this.invitedBy = invitedBy;
    }

    public String getInviteeEmail() {
        return inviteeEmail;
    }

    public void setInviteeEmail(String inviteeEmail) {
        this.inviteeEmail = inviteeEmail;
    }

    public String getInviteToken() {
        return inviteToken;
    }

    public void setInviteToken(String inviteToken) {
        this.inviteToken = inviteToken;
    }

    public CampaignRole getIntendedRole() {
        return intendedRole;
    }

    public void setIntendedRole(CampaignRole intendedRole) {
        this.intendedRole = intendedRole;
    }

    public InviteStatus getStatus() {
        return status;
    }

    public void setStatus(InviteStatus status) {
        this.status = status;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
}
