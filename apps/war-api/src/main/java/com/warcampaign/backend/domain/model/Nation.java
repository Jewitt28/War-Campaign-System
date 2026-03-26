package com.warcampaign.backend.domain.model;

import jakarta.persistence.*;

@Entity
@Table(name = "nation",
        uniqueConstraints = @UniqueConstraint(name = "uq_nation_campaign_key", columnNames = {"campaign_id", "nation_key"}))
public class Nation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "faction_id")
    private Faction faction;

    @Column(name = "nation_key", nullable = false, length = 50)
    private String nationKey;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "doctrine_profile_key", length = 80)
    private String doctrineProfileKey;

    @Column(name = "is_npc", nullable = false)
    private boolean npc;

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

    public String getNationKey() {
        return nationKey;
    }

    public void setNationKey(String nationKey) {
        this.nationKey = nationKey;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDoctrineProfileKey() {
        return doctrineProfileKey;
    }

    public void setDoctrineProfileKey(String doctrineProfileKey) {
        this.doctrineProfileKey = doctrineProfileKey;
    }

    public boolean isNpc() {
        return npc;
    }

    public void setNpc(boolean npc) {
        this.npc = npc;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }
}
