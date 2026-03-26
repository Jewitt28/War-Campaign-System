package com.warcampaign.backend.domain.model;

import jakarta.persistence.*;

@Entity
@Table(name = "theatre",
        uniqueConstraints = @UniqueConstraint(name = "uq_theatre_campaign_key", columnNames = {"campaign_id", "theatre_key"}))
public class Theatre extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(name = "theatre_key", nullable = false, length = 50)
    private String theatreKey;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(nullable = false)
    private boolean active = true;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public String getTheatreKey() {
        return theatreKey;
    }

    public void setTheatreKey(String theatreKey) {
        this.theatreKey = theatreKey;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
