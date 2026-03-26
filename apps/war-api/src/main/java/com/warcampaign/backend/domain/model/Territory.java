package com.warcampaign.backend.domain.model;

import jakarta.persistence.*;

@Entity
@Table(name = "territory",
        uniqueConstraints = @UniqueConstraint(name = "uq_territory_campaign_key", columnNames = {"campaign_id", "territory_key"}))
public class Territory extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "theatre_id", nullable = false)
    private Theatre theatre;

    @Column(name = "theatre_key", nullable = false, length = 50)
    private String legacyTheatreKey;

    @Column(name = "territory_key", nullable = false, length = 50)
    private String territoryKey;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "terrain_type", nullable = false, length = 50)
    private String terrainType = "UNKNOWN";

    @Column(name = "strategic_tags_json", columnDefinition = "TEXT")
    private String strategicTagsJson;

    @Column(name = "base_industry", nullable = false)
    private int baseIndustry;

    @Column(name = "base_manpower", nullable = false)
    private int baseManpower;

    @Column(name = "has_port", nullable = false)
    private boolean hasPort;

    @Column(name = "has_airfield", nullable = false)
    private boolean hasAirfield;

    @Column(name = "max_fort_level", nullable = false)
    private int maxFortLevel;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public Theatre getTheatre() {
        return theatre;
    }

    public void setTheatre(Theatre theatre) {
        this.theatre = theatre;
        this.legacyTheatreKey = theatre != null ? theatre.getTheatreKey() : null;
    }

    public String getLegacyTheatreKey() {
        return legacyTheatreKey;
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

    public String getTerrainType() {
        return terrainType;
    }

    public void setTerrainType(String terrainType) {
        this.terrainType = terrainType;
    }

    public String getStrategicTagsJson() {
        return strategicTagsJson;
    }

    public void setStrategicTagsJson(String strategicTagsJson) {
        this.strategicTagsJson = strategicTagsJson;
    }

    public int getBaseIndustry() {
        return baseIndustry;
    }

    public void setBaseIndustry(int baseIndustry) {
        this.baseIndustry = baseIndustry;
    }

    public int getBaseManpower() {
        return baseManpower;
    }

    public void setBaseManpower(int baseManpower) {
        this.baseManpower = baseManpower;
    }

    public boolean isHasPort() {
        return hasPort;
    }

    public void setHasPort(boolean hasPort) {
        this.hasPort = hasPort;
    }

    public boolean isHasAirfield() {
        return hasAirfield;
    }

    public void setHasAirfield(boolean hasAirfield) {
        this.hasAirfield = hasAirfield;
    }

    public int getMaxFortLevel() {
        return maxFortLevel;
    }

    public void setMaxFortLevel(int maxFortLevel) {
        this.maxFortLevel = maxFortLevel;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }
}
