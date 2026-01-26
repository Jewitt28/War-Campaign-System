/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useCampaignStore, type FactionKey } from "../store/useCampaignStore";
import type { PlatoonCondition, PlatoonTrait } from "../domain/types";
import {
  getPlatoonArchetypeById,
  getPlatoonArchetypeByTrait,
  getPlatoonArchetypeForTraits,
  normalizePlatoonTrait,
  type PlatoonArchetypeId,
} from "../domain/platoonArchetypes";
import { formatTerritoryLabel } from "./territoryLabel";
import { getFactionAccent } from "./factionColors";
import { factionLabel } from "../store/factionLabel";
import { nationLabel } from "../store/nationLabel";

const CONDITION_ORDER: PlatoonCondition[] = [
  "SHATTERED",
  "DEPLETED",
  "WORN",
  "FRESH",
];
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(Math.max(n, lo), hi);

function nextBetterCondition(c: PlatoonCondition, steps = 1): PlatoonCondition {
  const idx = CONDITION_ORDER.indexOf(c);
  if (idx < 0) return c;
  return CONDITION_ORDER[clamp(idx + steps, 0, CONDITION_ORDER.length - 1)];
}

function logAction(type: string, text: string) {
  const s: any = useCampaignStore.getState();
  if (!Array.isArray(s.turnLog)) return;
  useCampaignStore.setState({
    turnLog: [{ ts: Date.now(), type, text }, ...s.turnLog],
  } as any);
}

function patchPlatoon(platoonId: string, patch: any) {
  const s: any = useCampaignStore.getState();
  const p = s.platoonsById?.[platoonId];
  if (!p) return;
  useCampaignStore.setState({
    platoonsById: {
      ...s.platoonsById,
      [platoonId]: { ...p, ...patch },
    },
  } as any);
}

export default function PlatoonsPanel() {
  const selectedTerritoryId = useCampaignStore((s) => s.selectedTerritoryId);
  const platoonsById = useCampaignStore((s) => s.platoonsById);
  const selectedPlatoonId = useCampaignStore((s) => s.selectedPlatoonId);
  const setSelectedPlatoonId = useCampaignStore((s) => s.setSelectedPlatoonId);
  const setSelectedTerritory = useCampaignStore((s) => s.setSelectedTerritory);
  const viewerFaction = useCampaignStore((s) => s.viewerFaction);
  const createPlatoonWithLoadout = useCampaignStore(
    (s) => s.createPlatoonWithLoadout,
  );
  const viewerNation = useCampaignStore((s) => s.viewerNation);
  const viewerMode = useCampaignStore((s) => s.viewerMode);
  const territoryNameById = useCampaignStore((s) => s.territoryNameById);
  const customNations = useCampaignStore((s) => s.customNations);
  const customs = useCampaignStore((s) => s.customs);

  const ensureSupplies = useCampaignStore((s) => s.ensureSupplies);
  const getSupplies = useCampaignStore((s) => s.getSupplies);
  const spendSupplies = useCampaignStore((s) => s.spendSupplies);

  useEffect(() => {
    ensureSupplies();
  }, [ensureSupplies]);

  const supplies = useMemo(
    () => getSupplies(viewerNation),
    [getSupplies, viewerNation],
  );
  const accentColor = getFactionAccent({
    viewerNation,
    viewerFaction,
    customNations,
    customs,
  });

  // const platoonsHere = useMemo(() => {
  //   if (!selectedTerritoryId) return [];
  //   return Object.values(platoonsById).filter((p) => p.territoryId === selectedTerritoryId); <<< old, platoons shown by territory method. swapped this for all platoons which link to territory.
  // }, [platoonsById, selectedTerritoryId]);
  const allPlatoons = useMemo(
    () => Object.values(platoonsById),
    [platoonsById],
  );
  const visiblePlatoons = useMemo(() => {
    if (viewerMode === "GM") return allPlatoons;
    return allPlatoons.filter((platoon) => platoon.nation === viewerNation);
  }, [allPlatoons, viewerMode, viewerNation]);

  const selectedPlatoon = selectedPlatoonId
    ? platoonsById[selectedPlatoonId]
    : undefined;
  const safeSelected = selectedPlatoon;

  const [renameDraft, setRenameDraft] = useState<string>("");
  const [refitPct, setRefitPct] = useState<number>(10);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardName, setWizardName] = useState("");
  const [wizardTrait, setWizardTrait] = useState<PlatoonTrait | "">("");
  const [wizardMpBase, setWizardMpBase] = useState(1);

  const wizardSteps = ["Specialism", "Mobility", "Name"];

  // Costs (tune later)
  const COST_REFIT_PER_1 = 1;
  const COST_UPGRADE_MP = 25;
  const COST_UPGRADE_CONDITION = 15;

  const COST_TOGGLE_ENTRENCH = 10;
  const COST_TRAIT_RECON = 20;
  const COST_TRAIT_ENGINEERS = 20;
  const COST_TRAIT_ARMOURED = 30;

  const traitCosts: Record<PlatoonTrait, number> = {
    RECON: COST_TRAIT_RECON,
    ENGINEERS: COST_TRAIT_ENGINEERS,
    ARMOURED: COST_TRAIT_ARMOURED,
  };
  const traitInfo: Record<PlatoonTrait, string> = {
    RECON: getPlatoonArchetypeByTrait("RECON").summary,
    ENGINEERS: getPlatoonArchetypeByTrait("ENGINEERS").summary,
    ARMOURED: getPlatoonArchetypeByTrait("ARMOURED").summary,
  };

  const canAfford = (cost: number) => supplies >= cost;
  const mustMatchNation = safeSelected
    ? safeSelected.nation === viewerNation
    : false;
  const conditionColor: Record<PlatoonCondition, string> = {
    FRESH: "#22c55e",
    WORN: "#eab308",
    DEPLETED: "#f97316",
    SHATTERED: "#ef4444",
  };
  const classStyles: Record<
    PlatoonArchetypeId,
    { label: string; color: string }
  > = {
    INFANTRY: {
      label: getPlatoonArchetypeById("INFANTRY").label,
      color: "#94a3b8",
    },
    RECON: { label: getPlatoonArchetypeById("RECON").label, color: "#38bdf8" },
    ENGINEERS: {
      label: getPlatoonArchetypeById("ENGINEERS").label,
      color: "#fbbf24",
    },
    ARMOURED: {
      label: getPlatoonArchetypeById("ARMOURED").label,
      color: "#a78bfa",
    },
  };
  const getPlatoonClass = (platoonTraits?: Array<PlatoonTrait | string>) =>
    getPlatoonArchetypeForTraits(platoonTraits).id;
  const formatTraits = (platoonTraits?: Array<PlatoonTrait | string>) => {
    const normalized = (platoonTraits ?? [])
      .map((trait) => normalizePlatoonTrait(trait))
      .filter((trait): trait is PlatoonTrait => Boolean(trait));
    return normalized.length ? normalized.join(", ") : "";
  };
  const strengthColor = (strengthPct: number) => {
    if (strengthPct >= 75) return conditionColor.FRESH;

    if (strengthPct >= 50) return conditionColor.WORN;
    if (strengthPct >= 25) return conditionColor.DEPLETED;
    return conditionColor.SHATTERED;
  };

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
    if (!mustMatchNation) return;

    const ok = spendSupplies(safeSelected.nation, cost, "Refit");
    if (!ok) return;

    const nextCondition =
      target >= 80 && safeSelected.condition !== "FRESH"
        ? nextBetterCondition(safeSelected.condition, 1)
        : safeSelected.condition;

    patchPlatoon(safeSelected.id, {
      strengthPct: target,
      condition: nextCondition,
    });
    logAction(
      "PLATOON",
      `Refit ${safeSelected.name}: +${gain}% strength (cost ${cost})`,
    );
  };

  const openCreateWizard = () => {
    if (!selectedTerritoryId) return;
    setWizardName("");
    setWizardTrait("");
    setWizardMpBase(1);
    setWizardStep(0);
    setWizardOpen(true);
  };

  const closeCreateWizard = () => {
    setWizardOpen(false);
  };

  const goToWizardStep = (nextStep: number) => {
    setWizardStep(clamp(nextStep, 0, wizardSteps.length - 1));
  };

  const deployWizardPlatoon = () => {
    if (!selectedTerritoryId) return;
    const trimmedName = wizardName.trim();
    if (!trimmedName) return;
    createPlatoonWithLoadout(viewerFaction as FactionKey, selectedTerritoryId, {
      name: trimmedName,
      traits: wizardTrait ? [wizardTrait] : [],
      mpBase: wizardMpBase,
      condition: "FRESH",
      strengthPct: 100,
    });
    setWizardOpen(false);
  };

  const upgradeMobility = () => {
    if (!safeSelected) return;
    const cur = safeSelected.mpBase ?? 1;
    if (cur >= 3) return;
    if (!mustMatchNation) return;

    const ok = spendSupplies(
      safeSelected.nation,
      COST_UPGRADE_MP,
      "Mobility upgrade",
    );
    if (!ok) return;

    patchPlatoon(safeSelected.id, { mpBase: cur + 1 });
    logAction(
      "PLATOON",
      `Upgraded mobility for ${safeSelected.name}: MP ${cur} → ${cur + 1} (cost ${COST_UPGRADE_MP})`,
    );
  };

  const upgradeCondition = () => {
    if (!safeSelected) return;
    if (safeSelected.condition === "FRESH") return;
    if (!mustMatchNation) return;

    const ok = spendSupplies(
      safeSelected.nation,
      COST_UPGRADE_CONDITION,
      "Readiness upgrade",
    );
    if (!ok) return;

    const next = nextBetterCondition(safeSelected.condition, 1);
    patchPlatoon(safeSelected.id, { condition: next });

    logAction(
      "PLATOON",
      `Upgraded readiness for ${safeSelected.name}: ${safeSelected.condition} → ${next} (cost ${COST_UPGRADE_CONDITION})`,
    );
  };

  const traits: PlatoonTrait[] = (safeSelected?.traits ?? [])
    .map((trait) => normalizePlatoonTrait(trait))
    .filter((trait): trait is PlatoonTrait => Boolean(trait));
  const hasTrait = (t: PlatoonTrait) => traits.includes(t);
  const selectedArchetype = getPlatoonArchetypeForTraits(traits);
  const selectedClass = selectedArchetype.id;

  const addTrait = (trait: PlatoonTrait, cost: number) => {
    if (!safeSelected) return;
    if (!mustMatchNation) return;
    if (hasTrait(trait)) return;

    const ok = spendSupplies(safeSelected.nation, cost, `Trait: ${trait}`);
    if (!ok) return;

    patchPlatoon(safeSelected.id, { traits: [...traits, trait] });
    logAction(
      "PLATOON",
      `Purchased trait ${trait} for ${safeSelected.name} (cost ${cost})`,
    );
  };

  const toggleEntrench = () => {
    if (!safeSelected) return;
    if (!mustMatchNation) return;

    const currently = !!safeSelected.entrenched;

    if (!currently) {
      const ok = spendSupplies(
        safeSelected.nation,
        COST_TOGGLE_ENTRENCH,
        "Entrench",
      );
      if (!ok) return;
    }

    patchPlatoon(safeSelected.id, { entrenched: !currently });
    logAction(
      "PLATOON",
      `${safeSelected.name} is now ${!currently ? "ENTRENCHED" : "NOT entrenched"}`,
    );
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 900 }}>Platoons</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          Viewer nation: <b>{nationLabel(viewerNation, customNations)}</b> ·
          Supplies: <b>{supplies}</b>
        </div>
      </div>

      <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={openCreateWizard}
            disabled={!selectedTerritoryId}
            title={
              !selectedTerritoryId
                ? "Select a territory on the map to create a platoon."
                : undefined
            }
          >
            + Create Platoon{" "}
            {selectedTerritoryId
              ? `(as ${nationLabel(viewerNation, customNations)})`
              : ""}
          </button>
        </div>
        {wizardOpen ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.55)",
              display: "grid",
              placeItems: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: "min(720px, 92vw)",
                background: "#0f172a",
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${accentColor}55`,
                display: "grid",
                gap: 12,
                backgroundImage: `linear-gradient(135deg, ${accentColor}22, rgba(0,0,0,0))`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  Platoon Creation Wizard
                </div>
                <button type="button" onClick={closeCreateWizard}>
                  Close
                </button>
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Step {wizardStep + 1} of {wizardSteps.length} ·{" "}
                  <b>{wizardSteps[wizardStep]}</b>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {wizardSteps.map((step, index) => (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 999,
                        background:
                          index <= wizardStep
                            ? accentColor
                            : "rgba(255,255,255,.12)",
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Changes are staged locally and only saved when you click
                  Deploy.
                </div>
              </div>

              {wizardStep === 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>
                    Choose a platoon specialism
                  </div>
                  <label
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      type="radio"
                      name="specialism"
                      value=""
                      checked={wizardTrait === ""}
                      onChange={() => setWizardTrait("")}
                    />
                    <span style={{ display: "grid", gap: 2 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: classStyles.INFANTRY.color,
                            display: "inline-block",
                          }}
                        />
                        None (standard infantry)
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.75 }}>
                        Cost: <b>0</b> · Balanced infantry platoon.
                      </span>
                    </span>
                  </label>
                  {(["RECON", "ENGINEERS", "ARMOURED"] as PlatoonTrait[]).map(
                    (trait) => (
                      <label
                        key={trait}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="radio"
                          name="specialism"
                          value={trait}
                          checked={wizardTrait === trait}
                          onChange={() => setWizardTrait(trait)}
                        />
                        <span style={{ display: "grid", gap: 2 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: classStyles[trait].color,
                                display: "inline-block",
                              }}
                            />
                            {classStyles[trait].label}
                          </span>
                          <span style={{ fontSize: 12, opacity: 0.75 }}>
                            Cost: <b>{traitCosts[trait]}</b> ·{" "}
                            {traitInfo[trait]}
                          </span>
                        </span>
                      </label>
                    ),
                  )}
                </div>
              ) : null}

              {wizardStep === 1 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontWeight: 700 }}>Configure mobility</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ fontSize: 12, opacity: 0.8 }}>
                      Mobility (MP)
                    </label>
                    <select
                      value={wizardMpBase}
                      onChange={(e) =>
                        setWizardMpBase(
                          clamp(Number(e.target.value || 1), 1, 3),
                        )
                      }
                    >
                      {[1, 2, 3].map((value) => (
                        <option key={value} value={value}>
                          {value} MP
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    New platoons always deploy at full readiness and strength.
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>Name your platoon</div>
                  <input
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    placeholder="e.g. 1st Infantry"
                  />
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Territory: <b>{selectedTerritoryId ?? "—"}</b> · Nation:{" "}
                    <b>{nationLabel(viewerNation, customNations)}</b>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Specialism:{" "}
                    <b>
                      {wizardTrait
                        ? classStyles[wizardTrait].label
                        : classStyles.INFANTRY.label}
                    </b>{" "}
                    · MP <b>{wizardMpBase}</b> · Readiness <b>FRESH</b> · Strength{" "}
                    <b>100%</b>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => goToWizardStep(wizardStep - 1)}
                  disabled={wizardStep === 0}
                >
                  Back
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  {wizardStep < wizardSteps.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => goToWizardStep(wizardStep + 1)}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={deployWizardPlatoon}
                      disabled={!wizardName.trim()}
                    >
                      Deploy
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div
          style={{
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 10,
            padding: 10,
          }}
        >
          {visiblePlatoons.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>No platoons yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {visiblePlatoons.map((p) => {
                const platoonClass = getPlatoonClass(p.traits);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlatoonId(p.id);
                      setSelectedTerritory(p.territoryId);
                      setMoveTo("");
                    }}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.12)",
                      background:
                        selectedPlatoonId === p.id
                          ? "rgba(255,255,255,.06)"
                          : "rgba(0,0,0,.12)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          background: "rgba(15,23,42,.9)",
                          border: `1px solid ${classStyles[platoonClass].color}`,
                          color: classStyles[platoonClass].color,
                        }}
                        title={`Class: ${classStyles[platoonClass].label}`}
                      >
                        {classStyles[platoonClass].label}
                      </span>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: strengthColor(
                            p.strengthPct ?? 0,
                            // p.condition,
                          ),
                          boxShadow: "0 0 6px rgba(0,0,0,.4)",
                        }}
                        title={`Strength ${p.strengthPct}% (${p.condition})`}
                      />
                      <div style={{ fontWeight: 800 }}>{p.name}</div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {nationLabel(p.nation, customNations)} · {p.condition} ·{" "}
                      {p.strengthPct}% · MP {p.mpBase}
                      {p.entrenched ? " · ENTRENCHED" : ""}
                      {formatTraits(p.traits)
                        ? ` · ${formatTraits(p.traits)}`
                        : ""}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Territory:{" "}
                      {formatTerritoryLabel(p.territoryId, territoryNameById)} ·{" "}
                      Faction: {factionLabel(p.faction, customs)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div
          style={{
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 10,
            padding: 10,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            Platoon Details
          </div>

          {!safeSelected ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Click a platoon above to view details and actions.
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 4 }}>
                <div>
                  <b>Name:</b> {safeSelected.name}
                </div>
                <div>
                  <b>Nation:</b>{" "}
                  {nationLabel(safeSelected.nation, customNations)}
                </div>
                <div>
                  <b>Faction:</b>{" "}
                  {factionLabel(safeSelected.faction, customs)}
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
                  <b>Traits:</b>{" "}
                  {formatTraits(safeSelected.traits) || "—"}
                </div>
                <div>
                  <b>Class:</b> {classStyles[selectedClass].label}
                </div>
                <div>
                  <b>Campaign Role:</b> {selectedArchetype.role}
                </div>
                <div>
                  <b>Strengths:</b> {selectedArchetype.strengths.join(", ")}
                </div>
                <div>
                  <b>Weaknesses:</b> {selectedArchetype.weaknesses.join(", ")}
                </div>
              </div>

              <hr
                style={{
                  borderColor: "rgba(255,255,255,.12)",
                  margin: "10px 0",
                }}
              />

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

              <hr
                style={{
                  borderColor: "rgba(255,255,255,.12)",
                  margin: "10px 0",
                }}
              />

              {/* REFIT */}
              <div style={{ display: "grid", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>Refit</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Cost: <b>{refitPct * COST_REFIT_PER_1}</b> (per +{refitPct}
                    %)
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number"
                    value={refitPct}
                    onChange={(e) =>
                      setRefitPct(clamp(Number(e.target.value || 0), 1, 100))
                    }
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
                    !mustMatchNation ||
                    !canAfford(refitPct * COST_REFIT_PER_1)
                  }
                  title={
                    !mustMatchNation
                      ? "Switch Viewer nation to match platoon nation to spend supplies."
                      : undefined
                  }
                >
                  Refit (+{refitPct}%)
                </button>
              </div>

              <hr
                style={{
                  borderColor: "rgba(255,255,255,.12)",
                  margin: "10px 0",
                }}
              />

              {/* UPGRADES */}
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 800 }}>Upgrades</div>

                <div style={{ display: "grid", gap: 6 }}>
                  <button
                    type="button"
                    onClick={upgradeMobility}
                    disabled={
                      safeSelected.mpBase >= 3 ||
                      !mustMatchNation ||
                      !canAfford(COST_UPGRADE_MP)
                    }
                  >
                    Mobility +1 MP (cost {COST_UPGRADE_MP}){" "}
                    {safeSelected.mpBase >= 3 ? "· MAX" : ""}
                  </button>

                  <button
                    type="button"
                    onClick={upgradeCondition}
                    disabled={
                      safeSelected.condition === "FRESH" ||
                      !mustMatchNation ||
                      !canAfford(COST_UPGRADE_CONDITION)
                    }
                  >
                    Readiness +1 step (cost {COST_UPGRADE_CONDITION}){" "}
                    {safeSelected.condition === "FRESH" ? "· MAX" : ""}
                  </button>
                </div>
              </div>

              <hr
                style={{
                  borderColor: "rgba(255,255,255,.12)",
                  margin: "10px 0",
                }}
              />

              {/* SPECIALISMS */}
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 800 }}>Specialisms</div>

                <button
                  type="button"
                  onClick={() => addTrait("RECON", COST_TRAIT_RECON)}
                  disabled={
                    hasTrait("RECON") ||
                    !mustMatchNation ||
                    !canAfford(COST_TRAIT_RECON)
                  }
                >
                  Recon (cost {COST_TRAIT_RECON}){" "}
                  {hasTrait("RECON") ? "· OWNED" : ""}
                </button>

                <button
                  type="button"
                  onClick={() => addTrait("ENGINEERS", COST_TRAIT_ENGINEERS)}
                  disabled={
                    hasTrait("ENGINEERS") ||
                    !mustMatchNation ||
                    !canAfford(COST_TRAIT_ENGINEERS)
                  }
                >
                  Engineers (cost {COST_TRAIT_ENGINEERS}){" "}
                  {hasTrait("ENGINEERS") ? "· OWNED" : ""}
                </button>

                <button
                  type="button"
                  onClick={() => addTrait("ARMOURED", COST_TRAIT_ARMOURED)}
                  disabled={
                    hasTrait("ARMOURED") ||
                    !mustMatchNation ||
                    !canAfford(COST_TRAIT_ARMOURED)
                  }
                >
                  Armoured (cost {COST_TRAIT_ARMOURED}){" "}
                  {hasTrait("ARMOURED") ? "· OWNED" : ""}
                </button>

                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Effects get wired into turn resolution next (Recon→intel,
                  Engineers→fortifications, Armoured→breakthrough/logistics).
                </div>
              </div>

              <hr
                style={{
                  borderColor: "rgba(255,255,255,.12)",
                  margin: "10px 0",
                }}
              />

              {/* FORTIFY */}
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 800 }}>Fortify</div>
                <button
                  type="button"
                  onClick={toggleEntrench}
                  disabled={
                    !mustMatchNation ||
                    (!safeSelected.entrenched &&
                      !canAfford(COST_TOGGLE_ENTRENCH))
                  }
                >
                  {safeSelected.entrenched
                    ? "Remove Entrenchment"
                    : `Entrench (cost ${COST_TOGGLE_ENTRENCH})`}
                </button>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  We’ll apply entrenchment as a combat modifier when we wire
                  battle resolution.
                </div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
                Note: supplies are spent from the platoon’s nation — switch
                Viewer nation to match to apply upgrades/orders.
              </div>
            </>
          )}
        </div>
      </>
    </div>
  );
}
