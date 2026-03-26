package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.FactionType;
import jakarta.persistence.*;

@Entity
@Table(name = "faction",
        uniqueConstraints = @UniqueConstraint(name = "uq_faction_campaign_key", columnNames = {"campaign_id", "faction_key"}))
public class Faction extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(name = "faction_key", nullable = false, length = 50)
    private String factionKey;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FactionType type = FactionType.MAJOR;

    @Column(length = 20)
    private String color;

    @Column(name = "is_player_controlled", nullable = false)
    private boolean playerControlled = true;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public String getFactionKey() {
        return factionKey;
    }

    public void setFactionKey(String factionKey) {
        this.factionKey = factionKey;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public FactionType getType() {
        return type;
    }

    public void setType(FactionType type) {
        this.type = type;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public boolean isPlayerControlled() {
        return playerControlled;
    }

    public void setPlayerControlled(boolean playerControlled) {
        this.playerControlled = playerControlled;
    }
}
