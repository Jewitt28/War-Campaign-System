// src/setup/SetupPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useCampaignStore, type FactionKey } from "../store/useCampaignStore";
import { getSelectedFactionKey } from "./SetupRules";

import { loadTheatresData } from "../data/theatres";
import type { RegionDef } from "../data/regions";

function getFactionLabel(fk: string, customs: Array<{ id: string; name: string }>) {
  if (fk === "allies") return "Allies";
  if (fk === "axis") return "Axis";
  if (fk === "ussr") return "USSR";
  if (fk.startsWith("custom:")) {
    const id = fk.slice("custom:".length);
    const c = customs.find((x) => x.id === id);
    return c?.name ?? `Custom (${id.slice(0, 6)})`;
  }
  return fk;
}

export default function SetupPanel() {
  const {
    mode,
    setMode,
    toggleTheatre,
    activeTheatres,
    selectedSetupFaction,
    selectSetupFaction,
    customs,
    createCustomFaction,
    selectedCustomId,
    selectCustomFaction,
    homelands,
    setHomeland,
    setSelectedTerritory,
    resetAll,
    viewerMode,
  } = useCampaignStore();

  const isGM = viewerMode === "GM";
  const locked = mode === "PLAY";

  const [customName, setCustomName] = useState("");
  const [customColor, setCustomColor] = useState("#6aa84f");
  const [territoryNameById, setTerritoryNameById] = useState<Record<string, string>>({});

  const selectedKey = getSelectedFactionKey();

  // Regions (from region_groups.json)
  const [regionGroups, setRegionGroups] = useState<RegionDef[]>([]);
  const [regionId, setRegionId] = useState<string>("");
  const setRegions = useCampaignStore((s) => s.setRegions);
  const setSelectedRegion = useCampaignStore((s) => s.setSelectedRegion);
  const autoSetupWorld = useCampaignStore((s) => s.autoSetupWorld);

  // Store the user's last chosen territory id (may become invalid when region changes)
  const [regionTerritoryId, setRegionTerritoryId] = useState<string>("");

  useEffect(() => {
    loadTheatresData()
      .then((td) => {
        const map: Record<string, string> = {};
        for (const th of td.raw.theatres ?? []) {
          for (const t of th.territories ?? []) map[t.id] = t.name;
        }
        setTerritoryNameById(map);

        const groups = td.territoryGroups ?? [];
        setRegionGroups(groups);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRegions(groups as any);

        const first = groups[0];
        if (first) {
          setRegionId(first.id);
          setSelectedRegion(first.id);
          const firstTid = first.territories?.[0] ?? "";
          setRegionTerritoryId(firstTid);
          if (firstTid) setSelectedTerritory(firstTid);
        }
      })
      .catch((e) => console.error("Failed to load theatres data", e));
  }, [setRegions, setSelectedRegion, setSelectedTerritory]);

  const activeRegion = useMemo(() => regionGroups.find((g) => g.id === regionId) ?? null, [regionGroups, regionId]);

  const safeRegionTerritoryId = useMemo(() => {
    const list = activeRegion?.territories ?? [];
    if (list.length === 0) return "";
    if (list.includes(regionTerritoryId)) return regionTerritoryId;
    return list[0];
  }, [activeRegion, regionTerritoryId]);

  const canSetHomeland = !!selectedKey && !!safeRegionTerritoryId;

  const canEditSetup = isGM && !locked;

  return (
    <div style={{ padding: 12, border: "1px solid rgba(255,255,255,.15)", borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800 }}>Setup</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Mode: <b>{mode}</b> · Viewer: <b>{viewerMode}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={resetAll} disabled={!isGM}>
            Reset
          </button>

          {mode === "SETUP" ? (
            <button onClick={() => setMode("PLAY")} disabled={!isGM}>
              Lock Setup
            </button>
          ) : (
            <button onClick={() => setMode("SETUP")} disabled={!isGM}>
              Unlock (GM)
            </button>
          )}

          <button onClick={() => autoSetupWorld()} disabled={!isGM}>
            Lock Setup & Start Game
          </button>
        </div>
      </div>

      {!isGM && (
        <div style={{ marginTop: 8, padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", opacity: 0.9 }}>
          GM-only: setup controls are disabled in <b>PLAYER</b> mode.
        </div>
      )}

      <hr style={{ borderColor: "rgba(255,255,255,.12)" }} />

      {locked && (
        <div style={{ marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", opacity: 0.9 }}>
          Setup is locked (PLAY). GM can unlock to edit.
        </div>
      )}

      <div style={{ opacity: canEditSetup ? 1 : 0.6, pointerEvents: canEditSetup ? ("auto" as const) : ("none" as const) }}>
        <h4 style={{ margin: "8px 0" }}>1) Theatres in play</h4>
        {(["WE", "EE", "NA", "PA"] as const).map((id) => (
          <label key={id} style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
            <input type="checkbox" checked={activeTheatres[id]} onChange={() => toggleTheatre(id)} />
            <span>{id}</span>
          </label>
        ))}

        <h4 style={{ margin: "12px 0 8px" }}>2) Pick faction for homeland</h4>
        <select
          value={selectedSetupFaction ?? ""}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const v = e.target.value;
            if (v === "") return selectSetupFaction(null);
            if (v === "custom") return selectSetupFaction("custom");
            if (v === "allies" || v === "axis" || v === "ussr") return selectSetupFaction(v);
            selectSetupFaction(null);
          }}
          style={{ width: "100%" }}
        >
          <option value="">— Select —</option>
          <option value="allies">Allies</option>
          <option value="axis">Axis</option>
          <option value="ussr">USSR</option>
          <option value="custom">Custom</option>
        </select>

        {selectedSetupFaction === "custom" && (
          <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Custom faction</div>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Name</span>
              <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Free France" />
            </label>

            <label style={{ display: "grid", gap: 4, marginTop: 8 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Colour</span>
              <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} />
            </label>

            <button style={{ marginTop: 10 }} onClick={() => createCustomFaction(customName, customColor)}>
              Create + Select
            </button>

            {customs.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Existing customs</div>
                <select value={selectedCustomId ?? ""} onChange={(e) => selectCustomFaction(e.target.value || null)}>
                  <option value="">— Select —</option>
                  {customs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <h4 style={{ margin: "12px 0 8px" }}>3) Set homeland</h4>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Selected faction: <b>{selectedKey ? getFactionLabel(selectedKey, customs) : "none"}</b>
        </div>

        <div style={{ marginTop: 8, padding: 10, border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Set from Region Group</div>

          {regionGroups.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.8 }}>Loading region groups…</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.85 }}>Region</span>
                <select
                  value={regionId}
                  onChange={(e) => {
                    const nextRegionId = e.target.value;
                    setRegionId(nextRegionId);
                    setSelectedRegion(nextRegionId);

                    const nextRegion = regionGroups.find((g) => g.id === nextRegionId);
                    const firstTid = nextRegion?.territories?.[0] ?? "";
                    setRegionTerritoryId(firstTid);
                    if (firstTid) setSelectedTerritory(firstTid);
                  }}
                  style={{ width: "100%" }}
                >
                  {regionGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.85 }}>Territory</span>
                <select
                  value={safeRegionTerritoryId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setRegionTerritoryId(tid);
                    setSelectedTerritory(tid);
                  }}
                  style={{ width: "100%" }}
                >
                  {(activeRegion?.territories ?? []).map((tid) => (
                    <option key={tid} value={tid}>
                      {territoryNameById[tid] ? `${territoryNameById[tid]} (${tid})` : tid}
                    </option>
                  ))}
                </select>
              </label>

              <button
                disabled={!canSetHomeland}
                onClick={() => {
                  if (!selectedKey) return;
                  setHomeland(selectedKey as FactionKey, safeRegionTerritoryId);
                  setSelectedTerritory(safeRegionTerritoryId);
                }}
              >
                Set Homeland
              </button>

              <div style={{ fontSize: 12, opacity: 0.75 }}>You can still click the map instead if you prefer.</div>
            </div>
          )}
        </div>

        <h4 style={{ margin: "12px 0 8px" }}>Homelands</h4>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          {Object.keys(homelands).length === 0
            ? "None set yet."
            : Object.entries(homelands).map(([fk, tid]) => (
                <div key={fk}>
                  <b>{getFactionLabel(fk, customs)}</b>: {tid}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
