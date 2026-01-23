/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useCampaignStore, type FactionKey } from "../store/useCampaignStore";
import type { NormalizedData, Territory } from "../data/theatres";
import type { PlatoonCondition, PlatoonOrder, PlatoonTrait } from "../domain/types";

type Props = { data: NormalizedData | null };

const CONDITION_ORDER: PlatoonCondition[] = ["SHATTERED", "DEPLETED", "WORN", "FRESH"];
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

function nextBetterCondition(c: PlatoonCondition, steps = 1): PlatoonCondition {
  const idx = CONDITION_ORDER.indexOf(c);
  if (idx < 0) return c;
  return CONDITION_ORDER[clamp(idx + steps, 0, CONDITION_ORDER.length - 1)];
}

function territoryLabel(t: Territory | undefined) {
  return t ? `${t.name} (${t.id})` : "Unknown";
}

function logAction(type: string, text: string) {
  const s: any = useCampaignStore.getState();
  if (!Array.isArray(s.turnLog)) return;
  useCampaignStore.setState({ turnLog: [{ ts: Date.now(), type, text }, ...s.turnLog] } as any);
}

function patchPlatoon(platoonId: string, patch: any) {
  const s: any = useCampaignStore.getState();
  const p = s.platoonsById?.[platoonId];
  if (!p) return;
  useCampaignStore.setState(
    {
      platoonsById: {
        ...s.platoonsById,
        [platoonId]: { ...p, ...patch },
      },
    } as any
  );
}

export default function PlatoonsPanel({ data }: Props) {
  const selectedTerritoryId = useCampaignStore((s) => s.selectedTerritoryId);
  const platoonsById = useCampaignStore((s) => s.platoonsById);

  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const createPlatoon = useCampaignStore((s) => s.createPlatoon);

  const ensureSupplies = useCampaignStore((s) => s.ensureSupplies);
  const getSupplies = useCampaignStore((s) => s.getSupplies);
  const spendSupplies = useCampaignStore((s) => s.spendSupplies);

  useEffect(() => {
    ensureSupplies();
  }, [ensureSupplies]);

  const supplies = useMemo(() => getSupplies(viewerFaction), [getSupplies, viewerFaction]);

  const platoonsHere = useMemo(() => {
    if (!selectedTerritoryId) return [];
    return Object.values(platoonsById).filter((p) => p.territoryId === selectedTerritoryId);
  }, [platoonsById, selectedTerritoryId]);

  const [selectedPlatoonId, setSelectedPlatoonId] = useState<string>("");
  const selectedPlatoon = selectedPlatoonId ? platoonsById[selectedPlatoonId] : undefined;
  const safeSelected =
    selectedPlatoon && selectedPlatoon.territoryId === selectedTerritoryId ? selectedPlatoon : undefined;

  const [moveTo, setMoveTo] = useState<string>("");

  const adjTargets = useMemo((): Territory[] => {
    if (!data || !safeSelected) return [];
    const from = data.territoryById.get(safeSelected.territoryId);
    if (!from) return [];
    return from.adj
      .map((id) => data.territoryById.get(id))
      .filter((t): t is Territory => !!t);
  }, [data, safeSelected]);

  const [renameDraft, setRenameDraft] = useState<string>("");
  const [refitPct, setRefitPct] = useState<number>(10);

  // Costs (tune later)
  const COST_REFIT_PER_1 = 1;
  const COST_UPGRADE_MP = 25;
  const COST_UPGRADE_CONDITION = 15;

  const COST_TOGGLE_ENTRENCH = 10;
  const COST_TRAIT_RECON = 20;
  const COST_TRAIT_ENGINEERS = 20;
  const COST_TRAIT_MOTORIZED = 30;

  const canAfford = (cost: number) => supplies >= cost;
  const mustMatchFaction = safeSelected ? safeSelected.faction === viewerFaction : false;

  const applyRename = () => {
    if (!safeSelected) return;
    const name = renameDraft.trim();
    if (!name) return;

    patchPlatoon(safeSelected.id, { name });
    logAction("PLATOON", `Renamed platoon ${safeSelected.id} to "${name}"`);
    setRenameDraft("");
  };

  const applyRefit = () => {
    if (!safeSelected) return;

    const cur = safeSelected.strengthPct ?? 0;
    const target = clamp(cur + refitPct, 0, 100);
    const gain = target - cur;
    const cost = gain * COST_REFIT_PER_1;

    if (gain <= 0) return;
    if (!mustMatchFaction) return;

    const ok = spendSupplies(safeSelected.faction, cost, "Refit");
    if (!ok) return;

    const nextCondition =
      target >= 80 && safeSelected.condition !== "FRESH"
        ? nextBetterCondition(safeSelected.condition, 1)
        : safeSelected.condition;

    patchPlatoon(safeSelected.id, { strengthPct: target, condition: nextCondition });
    logAction("PLATOON", `Refit ${safeSelected.name}: +${gain}% strength (cost ${cost})`);
  };

  const upgradeMobility = () => {
    if (!safeSelected) return;
    const cur = safeSelected.mpBase ?? 1;
    if (cur >= 3) return;
    if (!mustMatchFaction) return;

    const ok = spendSupplies(safeSelected.faction, COST_UPGRADE_MP, "Mobility upgrade");
    if (!ok) return;

    patchPlatoon(safeSelected.id, { mpBase: cur + 1 });
    logAction(
      "PLATOON",
      `Upgraded mobility for ${safeSelected.name}: MP ${cur} → ${cur + 1} (cost ${COST_UPGRADE_MP})`
    );
  };

  const upgradeCondition = () => {
    if (!safeSelected) return;
    if (safeSelected.condition === "FRESH") return;
    if (!mustMatchFaction) return;

    const ok = spendSupplies(safeSelected.faction, COST_UPGRADE_CONDITION, "Readiness upgrade");
    if (!ok) return;

    const next = nextBetterCondition(safeSelected.condition, 1);
    patchPlatoon(safeSelected.id, { condition: next });

    logAction(
      "PLATOON",
      `Upgraded readiness for ${safeSelected.name}: ${safeSelected.condition} → ${next} (cost ${COST_UPGRADE_CONDITION})`
    );
  };

  const traits: PlatoonTrait[] = (safeSelected?.traits ?? []) as PlatoonTrait[];
  const hasTrait = (t: PlatoonTrait) => traits.includes(t);

  const addTrait = (trait: PlatoonTrait, cost: number) => {
    if (!safeSelected) return;
    if (!mustMatchFaction) return;
    if (hasTrait(trait)) return;

    const ok = spendSupplies(safeSelected.faction, cost, `Trait: ${trait}`);
    if (!ok) return;

    patchPlatoon(safeSelected.id, { traits: [...traits, trait] });
    logAction("PLATOON", `Purchased trait ${trait} for ${safeSelected.name} (cost ${cost})`);
  };

  const toggleEntrench = () => {
    if (!safeSelected) return;
    if (!mustMatchFaction) return;

    const currently = !!safeSelected.entrenched;

    if (!currently) {
      const ok = spendSupplies(safeSelected.faction, COST_TOGGLE_ENTRENCH, "Entrench");
      if (!ok) return;
    }

    patchPlatoon(safeSelected.id, { entrenched: !currently });
    logAction("PLATOON", `${safeSelected.name} is now ${!currently ? "ENTRENCHED" : "NOT entrenched"}`);
  };

  const setMoveOrder = () => {
    if (!safeSelected) return;
    if (!moveTo) return;
    if (!mustMatchFaction) return;

    // Prefer a real store action if it exists (older code likely had this)
    const s: any = useCampaignStore.getState();
    const setMoveOrderAction = s.setMoveOrder as
      | ((o: { platoonId: string; from: string; to: string; forcedMarch?: boolean }) => void)
      | undefined;

    if (setMoveOrderAction) {
      setMoveOrderAction({
        platoonId: safeSelected.id,
        from: safeSelected.territoryId,
        to: moveTo,
        forcedMarch: false,
      });
      logAction("ORDERS", `MOVE order: ${safeSelected.name} ${safeSelected.territoryId} → ${moveTo}`);
      return;
    }

    // Fallback: write into ordersByTurn if no action exists
    const turn = s.turnNumber ?? 1;

    const order: PlatoonOrder = {
      id: `${safeSelected.id}:${turn}:MOVE`,
      turn,
      faction: safeSelected.faction,
      platoonId: safeSelected.id,
      type: "MOVE",
      from: safeSelected.territoryId,
      path: [moveTo],
      forcedMarch: false,
      submittedAt: Date.now(),
    };

    const curFactionOrders: PlatoonOrder[] = (s.ordersByTurn?.[turn]?.[safeSelected.faction] ?? []) as PlatoonOrder[];

    useCampaignStore.setState(
      {
        ordersByTurn: {
          ...(s.ordersByTurn ?? {}),
          [turn]: {
            ...(s.ordersByTurn?.[turn] ?? {}),
            [safeSelected.faction]: [
              // Replace any existing MOVE order for this platoon this turn
              ...curFactionOrders.filter((o) => !(o.platoonId === safeSelected.id && o.turn === turn && o.type === "MOVE")),
              order,
            ],
          },
        },
      } as any
    );

    logAction("ORDERS", `MOVE order: ${safeSelected.name} ${safeSelected.territoryId} → ${moveTo}`);
  };

  const submitFactionOrders = () => {
    const s: any = useCampaignStore.getState();
    const submit = s.submitFactionOrders as ((faction: FactionKey) => void) | undefined;
    if (submit) submit(viewerFaction as FactionKey);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>Platoons</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Viewer faction: <b>{viewerFaction}</b> · Supplies: <b>{supplies}</b>
        </div>
      </div>

      {!selectedTerritoryId ? (
        <div style={{ fontSize: 13, opacity: 0.9 }}>Select a territory on the map to manage platoons.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => createPlatoon(viewerFaction as FactionKey, selectedTerritoryId)}>
              + Create Platoon (as {viewerFaction})
            </button>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 10 }}>
            {platoonsHere.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.8 }}>No platoons here yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {platoonsHere.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlatoonId(p.id);
                      setMoveTo("");
                    }}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.12)",
                      background: selectedPlatoonId === p.id ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.12)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {p.faction} · {p.condition} · {p.strengthPct}% · MP {p.mpBase}
                      {p.entrenched ? " · ENTRENCHED" : ""}
                      {(p.traits?.length ?? 0) > 0 ? ` · ${p.traits?.join(", ")}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 10 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Platoon Details</div>

            {!safeSelected ? (
              <div style={{ fontSize: 12, opacity: 0.8 }}>Click a platoon above to view details and actions.</div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 4 }}>
                  <div>
                    <b>Name:</b> {safeSelected.name}
                  </div>
                  <div>
                    <b>Faction:</b> {safeSelected.faction}
                  </div>
                  <div>
                    <b>Condition:</b> {safeSelected.condition}
                  </div>
                  <div>
                    <b>Strength:</b> {safeSelected.strengthPct}%
                  </div>
                  <div>
                    <b>Move:</b> MP {safeSelected.mpBase}
                  </div>
                  <div>
                    <b>Entrenched:</b> {safeSelected.entrenched ? "Yes" : "No"}
                  </div>
                  <div>
                    <b>Traits:</b> {(safeSelected.traits?.length ?? 0) ? safeSelected.traits?.join(", ") : "—"}
                  </div>
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,.12)", margin: "10px 0" }} />

                {/* MOVEMENT */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>Movement</div>

                  {!data ? (
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      Territory list not available — NormalizedData is null. Load theatres data first.
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        From:{" "}
                        <b>{territoryLabel(data.territoryById.get(safeSelected.territoryId))}</b>
                      </div>

                      <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                        <option value="">Select adjacent territory…</option>
                        {adjTargets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.id})
                          </option>
                        ))}
                      </select>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          disabled={!moveTo || !mustMatchFaction}
                          title={
                            !mustMatchFaction
                              ? "Switch Viewer faction to match platoon faction to issue orders."
                              : undefined
                          }
                          onClick={setMoveOrder}
                        >
                          Set MOVE Order
                        </button>

                        <button type="button" disabled={!mustMatchFaction} onClick={submitFactionOrders}>
                          Submit Orders (Faction)
                        </button>
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        Adjacency is pulled from theatres_all.json. GM resolves movement during RESOLUTION.
                      </div>
                    </>
                  )}
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,.12)", margin: "10px 0" }} />

                {/* RENAME */}
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 800 }}>Rename</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      placeholder="New name..."
                      style={{ flex: 1 }}
                    />
                    <button onClick={applyRename} disabled={!renameDraft.trim()}>
                      Save
                    </button>
                  </div>
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,.12)", margin: "10px 0" }} />

                {/* REFIT */}
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 800 }}>Refit</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Cost: <b>{refitPct * COST_REFIT_PER_1}</b> (per +{refitPct}%)
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="number"
                      value={refitPct}
                      onChange={(e) => setRefitPct(clamp(Number(e.target.value || 0), 1, 100))}
                      style={{ width: 90 }}
                    />
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Strength goes up (max 100%). May improve condition if ≥80%.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={applyRefit}
                    disabled={
                      safeSelected.strengthPct >= 100 ||
                      !mustMatchFaction ||
                      !canAfford(refitPct * COST_REFIT_PER_1)
                    }
                    title={
                      !mustMatchFaction
                        ? "Switch Viewer faction to match platoon faction to spend supplies."
                        : undefined
                    }
                  >
                    Refit (+{refitPct}%)
                  </button>
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,.12)", margin: "10px 0" }} />

                {/* UPGRADES */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>Upgrades</div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <button
                      type="button"
                      onClick={upgradeMobility}
                      disabled={safeSelected.mpBase >= 3 || !mustMatchFaction || !canAfford(COST_UPGRADE_MP)}
                    >
                      Mobility +1 MP (cost {COST_UPGRADE_MP}) {safeSelected.mpBase >= 3 ? "· MAX" : ""}
                    </button>

                    <button
                      type="button"
                      onClick={upgradeCondition}
                      disabled={
                        safeSelected.condition === "FRESH" ||
                        !mustMatchFaction ||
                        !canAfford(COST_UPGRADE_CONDITION)
                      }
                    >
                      Readiness +1 step (cost {COST_UPGRADE_CONDITION}){" "}
                      {safeSelected.condition === "FRESH" ? "· MAX" : ""}
                    </button>
                  </div>
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,.12)", margin: "10px 0" }} />

                {/* SPECIALISMS */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>Specialisms</div>

                  <button
                    type="button"
                    onClick={() => addTrait("RECON", COST_TRAIT_RECON)}
                    disabled={hasTrait("RECON") || !mustMatchFaction || !canAfford(COST_TRAIT_RECON)}
                  >
                    Recon (cost {COST_TRAIT_RECON}) {hasTrait("RECON") ? "· OWNED" : ""}
                  </button>

                  <button
                    type="button"
                    onClick={() => addTrait("ENGINEERS", COST_TRAIT_ENGINEERS)}
                    disabled={hasTrait("ENGINEERS") || !mustMatchFaction || !canAfford(COST_TRAIT_ENGINEERS)}
                  >
                    Engineers (cost {COST_TRAIT_ENGINEERS}) {hasTrait("ENGINEERS") ? "· OWNED" : ""}
                  </button>

                  <button
                    type="button"
                    onClick={() => addTrait("MOTORIZED", COST_TRAIT_MOTORIZED)}
                    disabled={hasTrait("MOTORIZED") || !mustMatchFaction || !canAfford(COST_TRAIT_MOTORIZED)}
                  >
                    Motorized (cost {COST_TRAIT_MOTORIZED}) {hasTrait("MOTORIZED") ? "· OWNED" : ""}
                  </button>

                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Effects get wired into turn resolution next (Recon→intel, Engineers→defense/locks, Motorized→movement).
                  </div>
                </div>

                <hr style={{ borderColor: "rgba(255,255,255,.12)", margin: "10px 0" }} />

                {/* FORTIFY */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>Fortify</div>
                  <button
                    type="button"
                    onClick={toggleEntrench}
                    disabled={!mustMatchFaction || (!safeSelected.entrenched && !canAfford(COST_TOGGLE_ENTRENCH))}
                  >
                    {safeSelected.entrenched ? "Remove Entrenchment" : `Entrench (cost ${COST_TOGGLE_ENTRENCH})`}
                  </button>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    We’ll apply entrenchment as a combat modifier when we wire battle resolution.
                  </div>
                </div>

                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
                  Note: supplies are spent from the platoon’s faction — switch Viewer faction to match to apply upgrades/orders.
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
