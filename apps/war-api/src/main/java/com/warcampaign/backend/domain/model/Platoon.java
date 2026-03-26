package com.warcampaign.backend.domain.model;

import jakarta.persistence.*;

@Entity
@Table(name = "platoon",
        uniqueConstraints = @UniqueConstraint(name = "uq_platoon_campaign_key", columnNames = {"campaign_id", "platoon_key"}))
public class Platoon extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "faction_id", nullable = false)
    private Faction faction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "nation_id")
    private Nation nation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_member_id")
    private CampaignMember assignedMember;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_territory_id")
    private Territory homeTerritory;

    @Column(name = "platoon_key", nullable = false, length = 60)
    private String platoonKey;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "unit_type", nullable = false, length = 60)
    private String unitType = "LINE";

    @Column(name = "hidden_from_players", nullable = false)
    private boolean hiddenFromPlayers;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public Faction getFaction() {
        return faction;
    }

    public void setFaction(Faction faction) {
        this.faction = faction;
    }

    public Nation getNation() {
        return nation;
    }

    public void setNation(Nation nation) {
        this.nation = nation;
    }

    public CampaignMember getAssignedMember() {
        return assignedMember;
    }

    public void setAssignedMember(CampaignMember assignedMember) {
        this.assignedMember = assignedMember;
    }

    public Territory getHomeTerritory() {
        return homeTerritory;
    }

    public void setHomeTerritory(Territory homeTerritory) {
        this.homeTerritory = homeTerritory;
    }

    public String getPlatoonKey() {
        return platoonKey;
    }

    public void setPlatoonKey(String platoonKey) {
        this.platoonKey = platoonKey;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUnitType() {
        return unitType;
    }

    public void setUnitType(String unitType) {
        this.unitType = unitType;
    }

    public boolean isHiddenFromPlayers() {
        return hiddenFromPlayers;
    }

    public void setHiddenFromPlayers(boolean hiddenFromPlayers) {
        this.hiddenFromPlayers = hiddenFromPlayers;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }
}
