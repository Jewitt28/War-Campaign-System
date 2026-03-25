package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.TerritoryControlStatus;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TerritoryControlStatus controlStatus;

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

    public TerritoryControlStatus getControlStatus() {
        return controlStatus;
    }

    public void setControlStatus(TerritoryControlStatus controlStatus) {
        this.controlStatus = controlStatus;
    }
}
