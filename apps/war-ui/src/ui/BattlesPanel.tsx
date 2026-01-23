// apps/war-ui/src/ui/BattlesPanel.tsx
import { useMemo, useState } from "react";
import { useCampaignStore, type FactionKey } from "../store/useCampaignStore";
import type { BattleOutcome, Contest } from "../domain/types";

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

// Adjust if your FactionKey union differs
const FACTIONS_IN_PLAY: FactionKey[] = ["allies", "axis", "ussr"];

type ConditionHit = 0 | 1 | 2;
const toConditionHit = (n: number): ConditionHit => {
  const c = clamp(Math.trunc(n), 0, 2);
  return c as ConditionHit;
};

// Minimal “auto-resolve stub”: fills reasonable defaults for ALL pending contests
function autoOutcomeForContest(c: Contest): BattleOutcome {
  // deterministic stub: attacker advantage + moderate losses
  return {
    contestId: c.id,
    winner: c.attackerFaction,
    attackerLossPct: 15,
    defenderLossPct: 25,
    attackerConditionHit: 0,
    defenderConditionHit: 1,
  };
}

export default function BattlesPanel() {
  const phase = useCampaignStore((s) => s.phase);
  const contestsByTerritory = useCampaignStore((s) => s.contestsByTerritory);
  const resolveBattles = useCampaignStore((s) => s.resolveBattles);

  // “Current player” selector (for the wider UX you described)
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const setViewerFaction = useCampaignStore((s) => s.setViewerFaction);

  const pendingContests = useMemo(() => {
    return Object.values(contestsByTerritory).filter((c) => c?.status === "BATTLE_PENDING") as Contest[];
  }, [contestsByTerritory]);

  const [battleOutcomes, setBattleOutcomes] = useState<Record<string, BattleOutcome>>({});

  const cycleFaction = (dir: 1 | -1) => {
    if (!FACTIONS_IN_PLAY.length) return;
    const idx = Math.max(0, FACTIONS_IN_PLAY.indexOf(viewerFaction));
    const next = FACTIONS_IN_PLAY[(idx + dir + FACTIONS_IN_PLAY.length) % FACTIONS_IN_PLAY.length];
    setViewerFaction(next);
  };

  const autoFillAll = () => {
    const filled: Record<string, BattleOutcome> = {};
    for (const c of pendingContests) filled[c.id] = autoOutcomeForContest(c);
    setBattleOutcomes(filled);
  };

  // Keep the “current player” UI visible even when not in Battles phase
  if (phase !== "BATTLES") {
    return (
      <div style={{ padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>Battles</h3>
        <div style={{ opacity: 0.85 }}>Battles are available in Phase: BATTLES.</div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Current player:</div>
          <select value={viewerFaction} onChange={(e) => setViewerFaction(e.target.value as FactionKey)}>
            {FACTIONS_IN_PLAY.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => cycleFaction(-1)}>
            ◀ Prev
          </button>
          <button type="button" onClick={() => cycleFaction(1)}>
            Next ▶
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>Battles (GM)</h3>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Pending: <b>{pendingContests.length}</b>
          </div>
        </div>

        {/* “Current player” controls (for your broader loop UX) */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Current player:</div>
          <select value={viewerFaction} onChange={(e) => setViewerFaction(e.target.value as FactionKey)}>
            {FACTIONS_IN_PLAY.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => cycleFaction(-1)}>
            ◀ Prev
          </button>
          <button type="button" onClick={() => cycleFaction(1)}>
            Next ▶
          </button>
        </div>
      </div>

      {pendingContests.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 10 }}>No pending battles.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {pendingContests.map((c) => {
            const current: BattleOutcome =
              battleOutcomes[c.id] ?? {
                contestId: c.id,
                winner: c.attackerFaction,
                attackerLossPct: 10,
                defenderLossPct: 10,
                attackerConditionHit: 0,
                defenderConditionHit: 0,
              };

            const update = (patch: Partial<BattleOutcome>) => {
              setBattleOutcomes((s) => ({
                ...s,
                [c.id]: { ...current, ...patch, contestId: c.id },
              }));
            };

            return (
              <div key={c.id} style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,.12)" }}>
                <div style={{ fontWeight: 800 }}>
                  {c.territoryId}: {c.attackerFaction} vs {c.defenderFaction}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{c.status}</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Winner</div>
                    <select
                      value={current.winner}
                      onChange={(e) => update({ winner: e.target.value as FactionKey })}
                      style={{ width: "100%" }}
                    >
                      <option value={c.attackerFaction}>{c.attackerFaction} (attacker)</option>
                      <option value={c.defenderFaction}>{c.defenderFaction} (defender)</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Quick preset</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            attackerLossPct: 10,
                            defenderLossPct: 25,
                            attackerConditionHit: 0,
                            defenderConditionHit: 1,
                          })
                        }
                      >
                        Minor
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            attackerLossPct: 25,
                            defenderLossPct: 25,
                            attackerConditionHit: 1,
                            defenderConditionHit: 1,
                          })
                        }
                      >
                        Bloody
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            attackerLossPct: 40,
                            defenderLossPct: 10,
                            attackerConditionHit: 2,
                            defenderConditionHit: 0,
                          })
                        }
                      >
                        Pyrrhic
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Attacker loss %</div>
                    <input
                      type="number"
                      value={current.attackerLossPct ?? 0}
                      onChange={(e) => update({ attackerLossPct: clamp(Number(e.target.value || 0), 0, 100) })}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Defender loss %</div>
                    <input
                      type="number"
                      value={current.defenderLossPct ?? 0}
                      onChange={(e) => update({ defenderLossPct: clamp(Number(e.target.value || 0), 0, 100) })}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                {/* Condition hits MUST be 0|1|2 (so use selects) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Attacker condition hit</div>
                    <select
                      value={toConditionHit(current.attackerConditionHit ?? 0)}
                      onChange={(e) => update({ attackerConditionHit: toConditionHit(Number(e.target.value)) })}
                      style={{ width: "100%" }}
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Defender condition hit</div>
                    <select
                      value={toConditionHit(current.defenderConditionHit ?? 0)}
                      onChange={(e) => update({ defenderConditionHit: toConditionHit(Number(e.target.value)) })}
                      style={{ width: "100%" }}
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => resolveBattles(Object.values(battleOutcomes))}
          disabled={pendingContests.length === 0}
        >
          Resolve Battles
        </button>

        <button type="button" onClick={autoFillAll} disabled={pendingContests.length === 0}>
          Auto-fill outcomes
        </button>

        <button type="button" onClick={() => setBattleOutcomes({})} disabled={pendingContests.length === 0}>
          Clear inputs
        </button>
      </div>
    </div>
  );
}
