package com.warcampaign.backend.domain.model;

import jakarta.persistence.*;

@Entity
@Table(name = "territory",
        uniqueConstraints = @UniqueConstraint(name = "uq_territory_campaign_key", columnNames = {"campaign_id", "territory_key"}))
public class Territory extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(name = "territory_key", nullable = false, length = 50)
    private String territoryKey;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "theatre_key", nullable = false, length = 50)
    private String theatreKey;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public String getTerritoryKey() {
        return territoryKey;
    }

    public void setTerritoryKey(String territoryKey) {
        this.territoryKey = territoryKey;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTheatreKey() {
        return theatreKey;
    }

    public void setTheatreKey(String theatreKey) {
        this.theatreKey = theatreKey;
    }
}
