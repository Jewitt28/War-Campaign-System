package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.BattleParticipantSide;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "battle_participant",
        uniqueConstraints = @UniqueConstraint(name = "uq_battle_participant_battle_platoon",
                columnNames = {"battle_id", "platoon_id"}))
public class BattleParticipant extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "battle_id", nullable = false)
    private Battle battle;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "platoon_id", nullable = false)
    private Platoon platoon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BattleParticipantSide side;

    @Column(name = "pre_condition_band", length = 30)
    private String preConditionBand;

    @Column(name = "post_condition_band", length = 30)
    private String postConditionBand;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    public Battle getBattle() {
        return battle;
    }

    public void setBattle(Battle battle) {
        this.battle = battle;
    }

    public Platoon getPlatoon() {
        return platoon;
    }

    public void setPlatoon(Platoon platoon) {
        this.platoon = platoon;
    }

    public BattleParticipantSide getSide() {
        return side;
    }

    public void setSide(BattleParticipantSide side) {
        this.side = side;
    }

    public String getPreConditionBand() {
        return preConditionBand;
    }

    public void setPreConditionBand(String preConditionBand) {
        this.preConditionBand = preConditionBand;
    }

    public String getPostConditionBand() {
        return postConditionBand;
    }

    public void setPostConditionBand(String postConditionBand) {
        this.postConditionBand = postConditionBand;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
