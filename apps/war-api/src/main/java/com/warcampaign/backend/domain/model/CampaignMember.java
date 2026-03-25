package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.CampaignRole;
import jakarta.persistence.*;

@Entity
@Table(name = "campaign_member",
        uniqueConstraints = @UniqueConstraint(name = "uq_campaign_member_campaign_user", columnNames = {"campaign_id", "user_id"}))
public class CampaignMember extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CampaignRole role;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public CampaignRole getRole() {
        return role;
    }

    public void setRole(CampaignRole role) {
        this.role = role;
    }
}
