import { useMemo, useState } from "react";
import type { NormalizedData } from "../data/theatres";
import type { VisibilityLevel } from "../data/visibility";
import { useCampaignStore } from "../store/useCampaignStore";
import type { PlatoonOrder, BattleOutcome, Contest } from "../domain/types";
import { NATIONS, type NationKey } from "../setup/NationDefinitions";
import {
  formatTerritoryLabel,
  formatTerritoryList,
  formatTerritoryText,
} from "./territoryLabel";


type Props = {
  data: NormalizedData | null;
};

function nationOptions(
  base: typeof NATIONS,
  customs: Array<{ id: string; name: string }>,
) {
  return [
    ...base.map((nation) => ({
      key: nation.id as NationKey,
      label: nation.name,
    })),
    ...customs.map((nation) => ({
      key: nation.id as NationKey,
      label: nation.name,
    })),
  ];
}

export default function PlayPanel({ data }: Props) {
  const {
    // viewer / intel
    viewerNation,
    setViewerNation,
    viewerFaction,
    viewerMode,
    setViewerMode,
    customNations,
    selectedTerritoryId,
    setSelectedTerritory,
    ownerByTerritory,
    setOwner,
    intelByTerritory,
    setIntelLevel,
    bulkSetIntelLevel,

    // mechanics
    phase,
    turnNumber,
    platoonsById,
    ordersByTurn,
    locksByTerritory,
    contestsByTerritory,
    createPlatoon,
    setPlatoonOrderMove,
    submitFactionOrders,
    resolveCurrentTurn,
    nextPhase,
    clearLocksAndContests,
    resolveBattles,

    // log
    turnLog,
  } = useCampaignStore();
  const territoryNameById = useCampaignStore((s) => s.territoryNameById);

  const isGM = viewerMode === "GM";

  const pendingContests = useMemo(() => {
    return Object.values(contestsByTerritory).filter((c) => c?.status === "BATTLE_PENDING") as Contest[];
  }, [contestsByTerritory]);

  const [battleOutcomes, setBattleOutcomes] = useState<Record<string, BattleOutcome>>({});

  const nations = useMemo(
    () => nationOptions(NATIONS, customNations),
    [customNations],
  );

  const selected = useMemo(() => {
    if (!data || !selectedTerritoryId) return null;
    return data.territoryById.get(selectedTerritoryId) ?? null;
  }, [data, selectedTerritoryId]);

  const isAdjacent = (a: string, b: string) => {
    const ta = data?.territoryById.get(a);
    return !!ta?.adj?.includes(b);
  };

  // territory groups
  const selectedGroupId = useCampaignStore((s) => s.selectedRegionId);
  const setSelectedGroup = useCampaignStore((s) => s.setSelectedRegion);
  const territoryGroups = useMemo(() => data?.territoryGroups ?? [], [data]);

  const safeGroupId = useMemo(() => {
    if (!territoryGroups.length) return "";
    if (selectedGroupId && territoryGroups.some((g) => g.id === selectedGroupId)) return selectedGroupId;
    return territoryGroups[0].id;
  }, [territoryGroups, selectedGroupId]);

  const activeGroup = useMemo(
    () => territoryGroups.find((g) => g.id === safeGroupId) ?? null,
    [territoryGroups, safeGroupId]
  );

  const applyGroupIntel = (level: VisibilityLevel) => {
    if (!activeGroup) return;
    bulkSetIntelLevel(activeGroup.territories, viewerNation, level);
  };

  // selected territory derived values
  const owner = selected ? (ownerByTerritory[selected.id] ?? "neutral") : "neutral";
  const level: VisibilityLevel = selected
    ? (intelByTerritory[selected.id]?.[viewerNation] ?? "NONE")
    : "NONE";

  const lock = selected ? locksByTerritory[selected.id] : undefined;
  const contest = selected ? contestsByTerritory[selected.id] : undefined;

  const platoonsHere = useMemo(() => {
    if (!selected) return [];
    return Object.values(platoonsById).filter((p) => p.territoryId === selected.id);
  }, [platoonsById, selected]);

  // Order builder UI state
  const [orderPlatoonId, setOrderPlatoonId] = useState<string>("");
  const [step1, setStep1] = useState<string>("");
  const [step2, setStep2] = useState<string>("");
  const [forcedMarch, setForcedMarch] = useState<boolean>(false);

  const currentNationOrders: PlatoonOrder[] = useMemo(() => {
    const byTurn = ordersByTurn[turnNumber] ?? {};
    return Object.values(byTurn)
      .flat()
      .filter((order) => {
        const platoon = platoonsById[order.platoonId];
        return platoon?.nation === viewerNation;
      }) as PlatoonOrder[];
  }, [ordersByTurn, platoonsById, turnNumber, viewerNation]);

  const selectedPlatoon = orderPlatoonId ? platoonsById[orderPlatoonId] : undefined;

  const step1Options = useMemo(() => {
    if (!selectedPlatoon) return [];
    const from = selectedPlatoon.territoryId;
    const t = data?.territoryById.get(from);
    return t?.adj ?? [];
  }, [data, selectedPlatoon]);

  const step2Options = useMemo(() => {
    if (!forcedMarch || !step1) return [];
    const t = data?.territoryById.get(step1);
    return t?.adj ?? [];
  }, [data, forcedMarch, step1]);

  const setMoveOrder = () => {
    if (!selectedPlatoon) return;
    if (!step1) return;

    const path = forcedMarch && step2 ? [step1, step2] : [step1];
    setPlatoonOrderMove(
      turnNumber,
      selectedPlatoon.faction,
      selectedPlatoon.id,
      path,
      forcedMarch,
    );
  };

  return (
    <div style={{ padding: 12, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800 }}>Play Tools</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Turn {turnNumber} · Phase {phase}
          </div>
        </div>
        <button onClick={() => setSelectedTerritory(null)}>Clear</button>
      </div>

      <hr style={{ borderColor: "rgba(255,255,255,.12)" }} />

      {/* Viewer Mode */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Viewer Mode</div>
        <select value={viewerMode} onChange={(e) => setViewerMode(e.target.value as "PLAYER" | "GM")} style={{ width: "100%" }}>
          <option value="PLAYER">PLAYER</option>
          <option value="GM">GM</option>
        </select>
        {!isGM && (
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
            Player mode: you can draft/submit orders and view intel, but GM tools are disabled.
          </div>
        )}
      </div>

      {/* Viewer nation */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Viewer (Fog of War)</div>
       <select value={viewerNation} onChange={(e) => setViewerNation(e.target.value as NationKey)} style={{ width: "100%" }}>
          {nations.map((nation) => (
            <option key={nation.key} value={nation.key}>
              {nation.label}
            </option>
          ))}
        </select>
      </div>

      {/* Territory Groups */}
      <div style={{ marginBottom: 10, opacity: isGM ? 1 : 0.6 }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Territory Groups</div>

        {territoryGroups.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.8 }}>No groups loaded (from theatres_all.json)…</div>
        ) : (
          <>
            <select value={safeGroupId} onChange={(e) => setSelectedGroup(e.target.value)} style={{ width: "100%" }}>
              {territoryGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button disabled={!isGM} onClick={() => applyGroupIntel("NONE")}>Hide</button>
              <button disabled={!isGM} onClick={() => applyGroupIntel("KNOWN")}>Known</button>
              <button disabled={!isGM} onClick={() => applyGroupIntel("SCOUTED")}>Scouted</button>
              <button disabled={!isGM} onClick={() => applyGroupIntel("FULL")}>Full</button>
            </div>

            {activeGroup && (
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                Territories:{" "}
                {formatTerritoryList(
                  activeGroup.territories,
                  territoryNameById,
                )}
              </div>
            )}
          </>
        )}
        {!isGM && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>GM-only: bulk intel changes.</div>}
      </div>

      {selected ? (
        <>
          <div style={{ fontWeight: 800 }}>
            {formatTerritoryLabel(selected.id, territoryNameById)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {selected.theatreTitle}
          </div>

          {/* Combat / lock banner */}
          {(lock || contest) && (
            <div style={{ marginTop: 8, padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.2)" }}>
              <div style={{ fontWeight: 700 }}>Locked: {lock?.reason ?? "—"}</div>
              {contest && (
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                  Contest: {contest.attackerFaction} vs {contest.defenderFaction} · {contest.status}
                </div>
              )}
            </div>
          )}

          <h4 style={{ margin: "12px 0 8px" }}>Owner</h4>
          <select
            value={owner}
            disabled={!isGM}
            onChange={(e) =>
              setOwner(
                selected.id,
                e.target.value as NationKey | "neutral" | "contested",
              )
            }
            style={{ width: "100%" }}
          >
            <option value="neutral">Neutral</option>
            <option value="contested">Contested</option>
            {nations.map((nation) => (
              <option key={nation.key} value={nation.key}>
                {nation.label}
              </option>
            ))}
          </select>
          {!isGM && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>GM-only: change owner.</div>}

          <h4 style={{ margin: "12px 0 8px" }}>Intel (for viewer)</h4>
          <select
            value={level}
            disabled={!isGM}
            onChange={(e) => setIntelLevel(selected.id, viewerNation, e.target.value as VisibilityLevel)}
            style={{ width: "100%" }}
          >
            <option value="NONE">None</option>
            <option value="KNOWN">Known</option>
            <option value="SCOUTED">Scouted</option>
            <option value="FULL">Full</option>
          </select>
          {!isGM && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>GM-only: change intel.</div>}

          <h4 style={{ margin: "12px 0 8px" }}>Platoons in territory</h4>
          {platoonsHere.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>None.</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {platoonsHere.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 8,
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: 8,
                    background: "rgba(0,0,0,.15)",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {p.faction} · {p.condition} · {p.strengthPct}% · MP {p.mpBase}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={() => createPlatoon(viewerFaction, selected.id)}>
              + Create Platoon (as {viewerNation})
            </button>
          </div>

          <h4 style={{ margin: "12px 0 8px" }}>Orders (this faction)</h4>

          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Pick platoon</div>
          <select value={orderPlatoonId} onChange={(e) => setOrderPlatoonId(e.target.value)} style={{ width: "100%" }}>
            <option value="">— Select —</option>
            {Object.values(platoonsById)
              .filter((p) => p.nation === viewerNation)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (
                  {formatTerritoryLabel(p.territoryId, territoryNameById)})
                </option>
              ))}
          </select>

          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12, opacity: 0.9 }}>
              <input type="checkbox" checked={forcedMarch} onChange={(e) => setForcedMarch(e.target.checked)} /> Forced march (2 steps)
            </label>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Step 1</div>
              <select value={step1} onChange={(e) => { setStep1(e.target.value); setStep2(""); }} style={{ width: "100%" }}>
                <option value="">—</option>
                {step1Options.map((tid) => (
                  <option key={tid} value={tid}>
                    {formatTerritoryLabel(tid, territoryNameById)}
                  </option>
                ))}
              </select>
            </div>

            {forcedMarch && (
              <div>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Step 2</div>
                <select value={step2} onChange={(e) => setStep2(e.target.value)} style={{ width: "100%" }}>
                  <option value="">—</option>
                  {step2Options.map((tid) => (
                    <option key={tid} value={tid}>
                      {formatTerritoryLabel(tid, territoryNameById)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button onClick={setMoveOrder} disabled={!orderPlatoonId || !step1 || (forcedMarch && !step2)}>
              Set MOVE Order
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={() => submitFactionOrders(turnNumber, viewerNation)}>Submit Orders</button>
            <button disabled={!isGM} onClick={() => resolveCurrentTurn(isAdjacent)}>Resolve Turn</button>
            <button disabled={!isGM} onClick={() => nextPhase(isAdjacent)}>Next Phase</button>
            <button disabled={!isGM} onClick={() => clearLocksAndContests()}>Dev: Clear Locks</button>
          </div>
          {!isGM && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>GM-only: resolve/advance/clear.</div>}

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
            <b>Current nation orders:</b>
            {currentNationOrders.length === 0 ? (
              <div style={{ opacity: 0.75 }}>None</div>
            ) : (
              <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                {currentNationOrders.map((o) => {
                  const platoonName =
                    platoonsById[o.platoonId]?.name ?? o.platoonId;
                  return (
                    <div key={o.id}>
                      {o.type} · platoon {platoonName} · from{" "}
                      {formatTerritoryLabel(o.from, territoryNameById)} · path{" "}
                      {(o.path ?? []).length
                        ? formatTerritoryList(o.path ?? [], territoryNameById)
                        : "—"}{" "}
                      {o.submittedAt ? "· SUBMITTED" : "· draft"}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
            Adjacents:{" "}
            {selected.adj.length
              ? formatTerritoryList(selected.adj, territoryNameById)
              : "none"}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, opacity: 0.9 }}>Select a campaign territory on the map.</div>
      )}

      <hr style={{ borderColor: "rgba(255,255,255,.12)", marginTop: 12 }} />

      <div style={{ fontWeight: 800, marginBottom: 6 }}>Turn Log</div>
      <div style={{ maxHeight: 240, overflow: "auto", fontSize: 12, opacity: 0.95, lineHeight: 1.5 }}>
        {turnLog.length === 0
          ? "No entries yet."
          : turnLog.slice(0, 30).map((e) => (
              <div key={e.ts}>
                <b>{e.type}</b> · {new Date(e.ts).toLocaleTimeString()} ·{" "}
                {formatTerritoryText(e.text, territoryNameById)}
              </div>
            ))}
      </div>

      {/* Battles (GM only) */}
      {isGM && phase === "BATTLES" && (
        <>
          <h4 style={{ margin: "12px 0 8px" }}>Battles (GM)</h4>

          {pendingContests.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>No pending battles.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {pendingContests.map((c) => {
                const current = battleOutcomes[c.id] ?? { contestId: c.id, winner: c.attackerFaction };
                return (
                  <div key={c.id} style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,.12)" }}>
                    <div style={{ fontWeight: 700 }}>
                      {formatTerritoryLabel(
                        c.territoryId,
                        territoryNameById,
                      )}
                      : {c.attackerFaction} vs {c.defenderFaction}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>Winner</div>
                        <select
                          value={current.winner}
                          onChange={(e) =>
                            setBattleOutcomes((s) => ({
                              ...s,
                              [c.id]: { ...current, winner: e.target.value as NationKey },
                            }))
                          }
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
                            onClick={() =>
                              setBattleOutcomes((s) => ({
                                ...s,
                                [c.id]: { ...current, attackerLossPct: 10, defenderLossPct: 25, attackerConditionHit: 0, defenderConditionHit: 1 },
                              }))
                            }
                          >
                            Minor
                          </button>
                          <button
                            onClick={() =>
                              setBattleOutcomes((s) => ({
                                ...s,
                                [c.id]: { ...current, attackerLossPct: 25, defenderLossPct: 25, attackerConditionHit: 1, defenderConditionHit: 1 },
                              }))
                            }
                          >
                            Bloody
                          </button>
                          <button
                            onClick={() =>
                              setBattleOutcomes((s) => ({
                                ...s,
                                [c.id]: { ...current, attackerLossPct: 40, defenderLossPct: 10, attackerConditionHit: 2, defenderConditionHit: 0 },
                              }))
                            }
                          >
                            Pyrrhic
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>Attacker loss %</div>
                        <input
                          type="number"
                          value={current.attackerLossPct ?? 0}
                          onChange={(e) =>
                            setBattleOutcomes((s) => ({
                              ...s,
                              [c.id]: { ...current, attackerLossPct: Number(e.target.value) },
                            }))
                          }
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>Defender loss %</div>
                        <input
                          type="number"
                          value={current.defenderLossPct ?? 0}
                          onChange={(e) =>
                            setBattleOutcomes((s) => ({
                              ...s,
                              [c.id]: { ...current, defenderLossPct: Number(e.target.value) },
                            }))
                          }
                          style={{ width: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={() => resolveBattles(Object.values(battleOutcomes))} disabled={pendingContests.length === 0}>
              Resolve Battles
            </button>
          </div>
        </>
      )}
    </div>
  );
}
