package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.TerritoryControlStatus;
import com.warcampaign.backend.domain.enums.TerritoryStrategicStatus;
import jakarta.persistence.*;

@Entity
@Table(name = "territory_state",
        uniqueConstraints = @UniqueConstraint(name = "uq_territory_state_turn_territory", columnNames = {"turn_id", "territory_id"}))
public class TerritoryState extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "turn_id", nullable = false)
    private Turn turn;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "territory_id", nullable = false)
    private Territory territory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "controlling_faction_id")
    private Faction controllingFaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "controller_nation_id")
    private Nation controllerNation;

    @Enumerated(EnumType.STRING)
    @Column(name = "control_status", nullable = false, length = 20)
    private TerritoryControlStatus legacyControlStatus = TerritoryControlStatus.NEUTRAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "strategic_status", nullable = false, length = 20)
    private TerritoryStrategicStatus strategicStatus = TerritoryStrategicStatus.NEUTRAL;

    @Column(name = "fort_level", nullable = false)
    private int fortLevel;

    @Column(name = "partisan_risk", nullable = false)
    private int partisanRisk;

    @Column(name = "supply_status", nullable = false, length = 30)
    private String supplyStatus = "SUPPLIED";

    @Column(name = "damage_json", columnDefinition = "TEXT")
    private String damageJson;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public Turn getTurn() {
        return turn;
    }

    public void setTurn(Turn turn) {
        this.turn = turn;
    }

    public Territory getTerritory() {
        return territory;
    }

    public void setTerritory(Territory territory) {
        this.territory = territory;
    }

    public Faction getControllingFaction() {
        return controllingFaction;
    }

    public void setControllingFaction(Faction controllingFaction) {
        this.controllingFaction = controllingFaction;
    }

    public Nation getControllerNation() {
        return controllerNation;
    }

    public void setControllerNation(Nation controllerNation) {
        this.controllerNation = controllerNation;
    }

    public TerritoryStrategicStatus getStrategicStatus() {
        return strategicStatus;
    }

    public void setStrategicStatus(TerritoryStrategicStatus strategicStatus) {
        this.strategicStatus = strategicStatus;
        this.legacyControlStatus = switch (strategicStatus) {
            case CONTROLLED, OCCUPIED, DEVASTATED -> TerritoryControlStatus.CONTROLLED;
            case CONTESTED -> TerritoryControlStatus.CONTESTED;
            case NEUTRAL -> TerritoryControlStatus.NEUTRAL;
        };
    }

    public int getFortLevel() {
        return fortLevel;
    }

    public void setFortLevel(int fortLevel) {
        this.fortLevel = fortLevel;
    }

    public int getPartisanRisk() {
        return partisanRisk;
    }

    public void setPartisanRisk(int partisanRisk) {
        this.partisanRisk = partisanRisk;
    }

    public String getSupplyStatus() {
        return supplyStatus;
    }

    public void setSupplyStatus(String supplyStatus) {
        this.supplyStatus = supplyStatus;
    }

    public String getDamageJson() {
        return damageJson;
    }

    public void setDamageJson(String damageJson) {
        this.damageJson = damageJson;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
