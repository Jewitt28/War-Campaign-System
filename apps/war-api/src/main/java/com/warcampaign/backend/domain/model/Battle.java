package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.BattleMode;
import com.warcampaign.backend.domain.enums.BattleStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "battle")
public class Battle extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @Column(name = "turn_number", nullable = false)
    private int turnNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "territory_id", nullable = false)
    private Territory territory;

    @Enumerated(EnumType.STRING)
    @Column(name = "battle_status", nullable = false, length = 20)
    private BattleStatus battleStatus = BattleStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attacker_faction_id", nullable = false)
    private Faction attackerFaction;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "defender_faction_id", nullable = false)
    private Faction defenderFaction;

    @Enumerated(EnumType.STRING)
    @Column(name = "battle_mode", nullable = false, length = 20)
    private BattleMode battleMode = BattleMode.TABLETOP;

    @Column(name = "scenario_key", length = 80)
    private String scenarioKey;

    @Column(name = "scheduled_for")
    private Instant scheduledFor;

    @Column(name = "tabletop_result_summary", columnDefinition = "TEXT")
    private String tabletopResultSummary;

    @Column(name = "strategic_result_json", columnDefinition = "TEXT")
    private String strategicResultJson;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    public Campaign getCampaign() {
        return campaign;
    }

    public void setCampaign(Campaign campaign) {
        this.campaign = campaign;
    }

    public int getTurnNumber() {
        return turnNumber;
    }

    public void setTurnNumber(int turnNumber) {
        this.turnNumber = turnNumber;
    }

    public Territory getTerritory() {
        return territory;
    }

    public void setTerritory(Territory territory) {
        this.territory = territory;
    }

    public BattleStatus getBattleStatus() {
        return battleStatus;
    }

    public void setBattleStatus(BattleStatus battleStatus) {
        this.battleStatus = battleStatus;
    }

    public Faction getAttackerFaction() {
        return attackerFaction;
    }

    public void setAttackerFaction(Faction attackerFaction) {
        this.attackerFaction = attackerFaction;
    }

    public Faction getDefenderFaction() {
        return defenderFaction;
    }

    public void setDefenderFaction(Faction defenderFaction) {
        this.defenderFaction = defenderFaction;
    }

    public BattleMode getBattleMode() {
        return battleMode;
    }

    public void setBattleMode(BattleMode battleMode) {
        this.battleMode = battleMode;
    }

    public String getScenarioKey() {
        return scenarioKey;
    }

    public void setScenarioKey(String scenarioKey) {
        this.scenarioKey = scenarioKey;
    }

    public Instant getScheduledFor() {
        return scheduledFor;
    }

    public void setScheduledFor(Instant scheduledFor) {
        this.scheduledFor = scheduledFor;
    }

    public String getTabletopResultSummary() {
        return tabletopResultSummary;
    }

    public void setTabletopResultSummary(String tabletopResultSummary) {
        this.tabletopResultSummary = tabletopResultSummary;
    }

    public String getStrategicResultJson() {
        return strategicResultJson;
    }

    public void setStrategicResultJson(String strategicResultJson) {
        this.strategicResultJson = strategicResultJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
