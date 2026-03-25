package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.PlatoonReadinessStatus;
import jakarta.persistence.*;

@Entity
@Table(name = "platoon_state",
        uniqueConstraints = @UniqueConstraint(name = "uq_platoon_state_turn_platoon", columnNames = {"turn_id", "platoon_id"}))
public class PlatoonState extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "turn_id", nullable = false)
    private Turn turn;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "platoon_id", nullable = false)
    private Platoon platoon;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "territory_id")
    private Territory territory;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlatoonReadinessStatus readinessStatus;

    @Column(nullable = false)
    private int strength;

    public Turn getTurn() {
        return turn;
    }

    public void setTurn(Turn turn) {
        this.turn = turn;
    }

    public Platoon getPlatoon() {
        return platoon;
    }

    public void setPlatoon(Platoon platoon) {
        this.platoon = platoon;
    }

    public Territory getTerritory() {
        return territory;
    }

    public void setTerritory(Territory territory) {
        this.territory = territory;
    }

    public PlatoonReadinessStatus getReadinessStatus() {
        return readinessStatus;
    }

    public void setReadinessStatus(PlatoonReadinessStatus readinessStatus) {
        this.readinessStatus = readinessStatus;
    }

    public int getStrength() {
        return strength;
    }

    public void setStrength(int strength) {
        this.strength = strength;
    }
}
